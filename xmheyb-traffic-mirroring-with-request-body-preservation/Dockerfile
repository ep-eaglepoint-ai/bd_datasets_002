FROM golang:1.21

WORKDIR /app

# Copy go mod file and evaluation first to ensure dependencies are downloaded
COPY go.mod ./
COPY evaluation/ ./evaluation/
RUN go mod download github.com/google/uuid
RUN go mod tidy

# Copy the entire project (excluding go.mod in subdirectories)
COPY repository_after/ ./repository_after/
COPY tests/ ./tests/

# Build the application
RUN go build -o /app/server /app/repository_after/main.go

# Run tests with race detector
CMD ["go", "test", "-v", "-race", "-count=1", "./tests/..."]
