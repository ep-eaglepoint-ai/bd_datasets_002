FROM golang:1.22.0

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy application files
COPY . .

# Run Go evaluation script
CMD ["go", "run", "evaluation/evaluation.go"]
