from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.config import settings
from app.routers.candidates import router as candidates_router
from app.routers.clients import router as clients_router
from app.routers.health import router as health_router
from app.routers.job_postings import router as job_postings_router
from app.routers.workers import router as workers_router

app = FastAPI(title="Nexflow Platform API", version="0.1.0")

# CORS — allow frontend in dev and configured production URL
origins = ["http://localhost:3000"]
if settings.frontend_url and settings.frontend_url not in origins:
    origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(candidates_router)
app.include_router(workers_router)
app.include_router(clients_router)
app.include_router(job_postings_router)
