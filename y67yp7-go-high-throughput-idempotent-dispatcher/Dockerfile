FROM golang:1.21-slim
RUN apt-get update && apt-get install -y gcc libc-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

# Set Go environment
ENV GOCACHE="/root/.cache/go-build"

# Default: run evaluation
CMD ["go", "run", "evaluation/evaluation.go"]
