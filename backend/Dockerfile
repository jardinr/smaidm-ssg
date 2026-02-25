FROM python:3.11-slim

WORKDIR /app

# Install system deps for lxml
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libxml2-dev libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use a Python entrypoint so $PORT is read programmatically at runtime.
# This avoids shell variable expansion issues in Docker CMD exec form.
CMD ["python", "-c", "import os, uvicorn; uvicorn.run('api.main:app', host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))"]
