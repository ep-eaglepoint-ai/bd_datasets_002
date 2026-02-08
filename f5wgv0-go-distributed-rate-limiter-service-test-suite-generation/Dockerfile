FROM golang:1.21

# Install Docker CLI for testcontainers
RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy all files
COPY . /app

# Install protoc and Go protobuf plugins
RUN apt-get update && apt-get install -y protobuf-compiler libprotobuf-dev && rm -rf /var/lib/apt/lists/*
# Install compatible versions for Go 1.21
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.31.0
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3.0

WORKDIR /app

CMD ["go", "test", "./tests/..."]
