FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git make gcc musl-dev postgresql-dev

WORKDIR /app

# Copy everything from repository_after
COPY repository_after/ ./

# Auto-create go.mod if it doesn't exist and install dependencies
RUN if [ ! -f go.mod ]; then \
      echo "go.mod not found, initializing..."; \
      go mod init eventstore; \
    fi && \
    go mod tidy && \
    go mod download

COPY evaluation/Evaluation.go ./evaluation/

# Build the application
RUN mkdir -p /app/bin
RUN CGO_ENABLED=1 go build -o /app/bin/eventstore ./cmd/eventstore
RUN CGO_ENABLED=1 go build -o /app/bin/tests ./cmd/tests
RUN CGO_ENABLED=1 go build -o /app/bin/evaluation ./evaluation/Evaluation.go

FROM golang:1.21-alpine

RUN apk add --no-cache ca-certificates postgresql-client git gcc musl-dev

WORKDIR /app

# Copy binaries to /usr/local/bin to avoid being hidden by /app mount
COPY --from=builder /app/bin/* /usr/local/bin/

# Set working directory for runtime
WORKDIR /app

CMD ["eventstore"]
