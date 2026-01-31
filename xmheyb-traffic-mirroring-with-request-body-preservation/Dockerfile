FROM golang:1.21

WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod ./
RUN go mod tidy

# Copy the entire project (excluding go.mod in subdirectories)
COPY repository_after/ ./repository_after/
COPY tests/ ./tests/

# Remove any go.mod in repository_after to avoid conflicts
RUN rm -f /app/repository_after/go.mod

# Build the application
RUN go build -o /app/server /app/repository_after/main.go

# Run tests with race detector
CMD ["go", "test", "-v", "-race", "-count=1", "./tests/..."]
