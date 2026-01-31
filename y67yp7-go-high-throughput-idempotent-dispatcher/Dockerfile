FROM golang:1.21-alpine AS go-builder

# Install Go test dependencies
WORKDIR /app/repository_after
COPY repository_after/ .
RUN go mod download || true && mkdir -p /go/pkg

FROM python:3.11-slim

# Install Go
COPY --from=golang:1.21-alpine /usr/local/go /usr/local/go
ENV PATH="/usr/local/go/bin:${PATH}"

WORKDIR /app
COPY . /app

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy Go modules
COPY --from=go-builder /go/pkg /go/pkg
ENV GOPATH="/go"

# Default: run evaluation
CMD ["python", "evaluation/evaluation.py"]
