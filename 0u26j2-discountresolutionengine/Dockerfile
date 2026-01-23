FROM golang:1.21-alpine

WORKDIR /app

# Copy go mod files
COPY repository_after/go.mod ./repository_after/
COPY repository_after/go.sum* ./repository_after/

# Download dependencies
WORKDIR /app/repository_after
RUN go mod download || true

# Copy source code
WORKDIR /app
COPY . .

# Set environment
ENV CGO_ENABLED=0

# Default command
CMD ["go", "test", "-v", "./repository_after/..."]