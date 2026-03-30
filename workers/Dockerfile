FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY workers/pyproject.toml ./workers/pyproject.toml
RUN uv pip install --system -e workers/

COPY workers/ ./workers/

CMD ["celery", "-A", "workers.celery_app", "worker", "--loglevel=info"]
