"""
Backblaze B2 storage service (S3-compatible API via boto3).

All blocking boto3 calls are wrapped in asyncio.get_event_loop().run_in_executor
so they don't block the async FastAPI event loop.

Required environment variables:
  B2_KEY_ID        — Backblaze application key ID
  B2_APP_KEY       — Backblaze application key secret
  B2_BUCKET_NAME   — Bucket name
  B2_ENDPOINT_URL  — S3-compatible endpoint, e.g. https://s3.us-west-004.backblazeb2.com
"""

import asyncio
import functools
from typing import IO

import boto3
from botocore.client import Config

from app.config import settings


def _get_client() -> "boto3.client":  # type: ignore[name-defined]
    """Return a configured boto3 S3 client for Backblaze B2."""
    if not settings.b2_key_id or not settings.b2_app_key or not settings.b2_endpoint_url:
        raise RuntimeError(
            "B2 storage is not configured. "
            "Set B2_KEY_ID, B2_APP_KEY, B2_BUCKET_NAME, and B2_ENDPOINT_URL."
        )
    return boto3.client(
        "s3",
        endpoint_url=settings.b2_endpoint_url,
        aws_access_key_id=settings.b2_key_id,
        aws_secret_access_key=settings.b2_app_key,
        config=Config(signature_version="s3v4"),
    )


async def upload_file(storage_key: str, file_obj: IO[bytes], content_type: str) -> None:
    """Upload file_obj to B2 under storage_key."""
    client = _get_client()
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        functools.partial(
            client.upload_fileobj,
            file_obj,
            settings.b2_bucket_name,
            storage_key,
            ExtraArgs={"ContentType": content_type},
        ),
    )


async def generate_presigned_download_url(storage_key: str, expires_in: int = 3600) -> str:
    """Return a time-limited pre-signed download URL for storage_key."""
    client = _get_client()
    loop = asyncio.get_event_loop()
    url: str = await loop.run_in_executor(
        None,
        functools.partial(
            client.generate_presigned_url,
            "get_object",
            Params={"Bucket": settings.b2_bucket_name, "Key": storage_key},
            ExpiresIn=expires_in,
        ),
    )
    return url


async def delete_file(storage_key: str) -> None:
    """Permanently delete a file from B2."""
    client = _get_client()
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        functools.partial(
            client.delete_object,
            Bucket=settings.b2_bucket_name,
            Key=storage_key,
        ),
    )
