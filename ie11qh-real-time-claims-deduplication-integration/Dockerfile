FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY repository_after/go.mod repository_after/go.sum ./
RUN go mod download

COPY repository_after/ ./
COPY tests/ ./tests/
COPY evaluation/ ./evaluation/

# Build the main application (optional, for future use)
RUN CGO_ENABLED=0 GOOS=linux go build -o claims-processor .

# Final stage with Go tools for testing and evaluation
FROM golang:1.21-alpine

WORKDIR /app
COPY repository_after/go.mod repository_after/go.sum ./
RUN go mod download

COPY repository_after/ ./
COPY tests/ ./tests/
COPY evaluation/ ./evaluation/

CMD ["./claims-processor"]
