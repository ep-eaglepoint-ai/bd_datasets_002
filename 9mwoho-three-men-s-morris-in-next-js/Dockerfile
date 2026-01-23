# Use Python slim image as base
FROM python:3.11-slim

# Install Node.js
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy project files
COPY . /app

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install dependencies for tests and application
# This ensures they are available in the container image
WORKDIR /app/tests
RUN npm install

WORKDIR /app/repository_after/three-mens-morris
RUN npm install

# Reset working directory
WORKDIR /app

# Default command
CMD ["python", "evaluation/evaluation.py"]
