FROM golang:1.21-alpine

WORKDIR /app

# Copy go mod files if they exist
COPY go.mod go.sum* ./

# Download dependencies
RUN go mod download || true

# Copy the rest of the application
COPY . /app

# Default command (will be overridden by docker-compose)
CMD ["go", "test", "./tests"]
