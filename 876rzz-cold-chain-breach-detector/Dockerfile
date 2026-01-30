FROM golang:1.21-alpine

WORKDIR /app

# Copy all application files first
COPY . /app

# Auto-create go.mod if it doesn't exist
RUN if [ ! -f go.mod ]; then \
        echo "go.mod not found, auto-creating..."; \
        go mod init cold-chain-breach-detector || true; \
        go mod tidy || true; \
    fi

# Download dependencies (will work even if go.mod was just created)
RUN go mod download || true

# Default command (will be overridden by docker-compose)
CMD ["go", "test", "./tests"]
