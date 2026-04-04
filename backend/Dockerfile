FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml uv.lock* ./
RUN uv pip install --system -e ".[dev]"

COPY . .

RUN chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]
