FROM golang:1.21

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . /app

# Create go.mod for repository_before (since it's restricted)
RUN echo 'module repository' > /app/repository_before/go.mod && \
    echo 'go 1.21' >> /app/repository_before/go.mod

WORKDIR /app/repository_before
RUN go mod tidy || true

WORKDIR /app/repository_after
RUN go mod tidy || true

WORKDIR /app/tests
RUN go mod tidy || true

WORKDIR /app/evaluation
RUN go mod tidy || true

RUN mkdir -p /app/evaluation/reports

WORKDIR /app

ENV CGO_ENABLED=1