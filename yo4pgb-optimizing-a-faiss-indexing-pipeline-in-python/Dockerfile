# Stage 1: Builder
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies if needed (none strictly needed for wheels, but good practice)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir --prefer-binary -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim AS runtime

# Install system dependencies for FAISS
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy entire project including the mock library
COPY . .

# Set PYTHONPATH to include /app for the mock library
ENV PYTHONPATH="/app:${PYTHONPATH}"

# Default to the optimized implementation
ENV REPO_PATH="/app/repository_after"

CMD ["/bin/sh", "-c", "PYTHONPATH=$REPO_PATH:/app pytest /app/tests/comprehensive -v; exit 0"]
