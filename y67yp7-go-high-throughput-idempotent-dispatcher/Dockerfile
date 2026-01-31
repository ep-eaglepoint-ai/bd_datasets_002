FROM golang:1.21 AS go-builder

# Install Go test dependencies
WORKDIR /app/repository_after
COPY repository_after/ .
RUN go mod download || true && mkdir -p /go/pkg

FROM python:3.11-slim

# Install Go (copy from the same Debian-based image type)
COPY --from=golang:1.21 /usr/local/go /usr/local/go
ENV PATH="/usr/local/go/bin:${PATH}"

WORKDIR /app
COPY . /app

# Install Python and Go runtime dependencies (gcc is needed for CGO/race)
RUN apt-get update && apt-get install -y gcc libc-dev && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt

# Copy Go modules
COPY --from=go-builder /go/pkg /go/pkg
ENV GOPATH="/go"
ENV GOCACHE="/root/.cache/go-build"

# Default: run evaluation
CMD ["python", "evaluation/evaluation.py"]
