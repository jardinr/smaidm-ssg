FROM python:3.11-slim

WORKDIR /app

# Install system deps for lxml
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libxml2-dev libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use shell form so $PORT is expanded at runtime from Railway's environment
CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
