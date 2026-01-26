FROM golang:1.21

# Install Docker CLI for testcontainers
RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy all files
COPY . /app

# Install protoc and Go protobuf plugins
RUN apt-get update && apt-get install -y protobuf-compiler && rm -rf /var/lib/apt/lists/*
# Install compatible versions for Go 1.21
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.31.0
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3.0

# Generate proto files for repository_after
WORKDIR /app/repository_after
RUN mkdir -p proto
RUN protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    proto/ratelimiter.proto

# Generate proto files for repository_before
WORKDIR /app/repository_before
RUN mkdir -p proto
RUN protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    proto/ratelimiter.proto

WORKDIR /app

CMD ["go", "test", "./tests/..."]
