# FROM python:3.11-slim
# WORKDIR /app
# COPY . /app
# RUN pip install --no-cache-dir -r requirements.txt
# CMD ["pytest", "-q", "tests"]

# FROM python:3.11-slim

# WORKDIR /app

# # Install PostgreSQL client for health checks
# RUN apt-get update && apt-get install -y \
#     postgresql-client \
#     libpq-dev \
#     gcc \
#     && rm -rf /var/lib/apt/lists/*

# # Copy requirements and install
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt

# # Copy application
# COPY . .

# # Set Python to unbuffered mode
# ENV PYTHONUNBUFFERED=1

# # Health check for PostgreSQL
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#     CMD python -c "import psycopg2; psycopg2.connect('postgresql://postgres:postgres@postgres:5432/postgres')" || exit 1

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Create necessary directories
RUN mkdir -p /app/evaluation_results

# Set default command (can be overridden in docker-compose)
CMD ["python", "-m", "pytest", "tests/", "-v"]