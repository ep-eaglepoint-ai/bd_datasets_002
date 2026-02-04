FROM golang:1.21-alpine

WORKDIR /app

# Install git for git info in evaluation
RUN apk add --no-cache git

# Copy go.mod and go.sum first for caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Default command (can be overridden by docker-compose)
CMD ["go", "test", "./tests/..."]
