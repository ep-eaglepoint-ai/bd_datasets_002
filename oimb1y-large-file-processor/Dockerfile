FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    libmagic-dev \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY repository_after/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy the entire project
COPY . /app

# Set environment variables - BOTH paths
ENV PYTHONPATH=/app/repository_after:/app/repository_before:/app
ENV DJANGO_SETTINGS_MODULE=config.settings

# Create symbolic links so repository_before can find Django
RUN ln -sf /app/repository_after/config /app/repository_before/config 2>/dev/null || true && \
    ln -sf /app/repository_after/manage.py /app/repository_before/manage.py 2>/dev/null || true

# Copy and set up entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]