"""
Worker file upload / download / delete endpoints.

Endpoints:
  POST   /api/v1/workers/{worker_id}/files              — upload a file
  GET    /api/v1/workers/{worker_id}/files              — list uploaded files
  GET    /api/v1/workers/{worker_id}/files/{file_id}/download — pre-signed download URL
  DELETE /api/v1/workers/{worker_id}/files/{file_id}    — delete file

Files are stored in Backblaze B2 via the S3-compatible API (app/services/b2.py).
Metadata (worker_id, file_name, content_type, storage_key, …) is persisted in
the worker_files table.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.worker_files import WorkerFile
from app.models.workers import Worker
from app.schemas.worker_files import (
    ALLOWED_DOCUMENT_TYPES,
    PaginatedWorkerFiles,
    WorkerFileDownloadResponse,
    WorkerFileRead,
)
from app.services import b2

router = APIRouter(prefix="/api/v1/workers", tags=["worker-files"])

# 50 MB upload limit
MAX_FILE_SIZE = 50 * 1024 * 1024


@router.post("/{worker_id}/files", response_model=WorkerFileRead, status_code=201)
async def upload_worker_file(
    worker_id: uuid.UUID,
    file: UploadFile,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    document_type: str | None = Query(None, description="Document category"),
) -> WorkerFileRead:
    """Upload a file and attach it to a worker."""
    # Validate worker exists
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")

    if document_type and document_type not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"document_type must be one of: {sorted(ALLOWED_DOCUMENT_TYPES)}",
        )

    # Read file contents to enforce size limit
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 50 MB limit")

    import io

    file_size = len(contents)
    content_type = file.content_type or "application/octet-stream"
    original_name = file.filename or "upload"

    # Build a unique storage key: workers/{worker_id}/{uuid}/{original_name}
    storage_key = f"workers/{worker_id}/{uuid.uuid4()}/{original_name}"

    try:
        await b2.upload_file(storage_key, io.BytesIO(contents), content_type)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"B2 upload failed: {exc}") from exc

    username: str | None = None
    if hasattr(current_user, "email"):
        username = current_user.email
    elif hasattr(current_user, "username"):
        username = current_user.username

    worker_file = WorkerFile(
        worker_id=worker_id,
        file_name=original_name,
        content_type=content_type,
        file_size=file_size,
        storage_key=storage_key,
        document_type=document_type,
        uploaded_by_user=username,
    )
    db.add(worker_file)
    await db.commit()
    await db.refresh(worker_file)
    return WorkerFileRead.model_validate(worker_file)


@router.get("/{worker_id}/files", response_model=PaginatedWorkerFiles)
async def list_worker_files(
    worker_id: uuid.UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedWorkerFiles:
    """List all uploaded files for a worker."""
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Worker not found")

    q = select(WorkerFile).where(WorkerFile.worker_id == worker_id)
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total: int = total_result.scalar_one()

    files_result = await db.execute(
        q.order_by(WorkerFile.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(files_result.scalars().all())
    return PaginatedWorkerFiles(
        items=[WorkerFileRead.model_validate(f) for f in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{worker_id}/files/{file_id}/download", response_model=WorkerFileDownloadResponse)
async def download_worker_file(
    worker_id: uuid.UUID,
    file_id: uuid.UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WorkerFileDownloadResponse:
    """Return a pre-signed URL (valid 1 hour) to download a file directly from B2."""
    result = await db.execute(
        select(WorkerFile).where(
            WorkerFile.id == file_id, WorkerFile.worker_id == worker_id
        )
    )
    worker_file = result.scalar_one_or_none()
    if worker_file is None:
        raise HTTPException(status_code=404, detail="File not found")

    expires_in = 3600
    try:
        url = await b2.generate_presigned_download_url(worker_file.storage_key, expires_in)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"B2 error: {exc}") from exc

    return WorkerFileDownloadResponse(url=url, expires_in=expires_in)


@router.delete("/{worker_id}/files/{file_id}", status_code=204)
async def delete_worker_file(
    worker_id: uuid.UUID,
    file_id: uuid.UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Delete a file from B2 and remove its metadata record."""
    result = await db.execute(
        select(WorkerFile).where(
            WorkerFile.id == file_id, WorkerFile.worker_id == worker_id
        )
    )
    worker_file = result.scalar_one_or_none()
    if worker_file is None:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        await b2.delete_file(worker_file.storage_key)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"B2 delete failed: {exc}") from exc

    await db.delete(worker_file)
    await db.commit()
