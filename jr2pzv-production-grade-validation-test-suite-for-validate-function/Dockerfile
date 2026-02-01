# Multi-stage build for platform independence
FROM golang:1.22.0 as go-builder

FROM python:3.11-slim

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy Go installation from builder stage
COPY --from=go-builder /usr/local/go /usr/local/go

# Set up Go environment
ENV PATH="/usr/local/go/bin:${PATH}"
ENV GOPATH="/root/go"
ENV GOBIN="/root/go/bin"

# Make Go available system-wide
RUN ln -sf /usr/local/go/bin/go /usr/bin/go

# Set working directory
WORKDIR /app

# Copy application files
COPY . .

# Verify installations
RUN go version && python3 --version

CMD ["python3", "-m", "evaluation.evaluation"]
