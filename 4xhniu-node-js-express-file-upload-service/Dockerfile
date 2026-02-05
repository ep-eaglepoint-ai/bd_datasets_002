FROM golang:1.21

# Install Python for evaluation script
RUN apt-get update && apt-get install -y python3 python3-pip

WORKDIR /app

COPY repository_after/go.mod ./
RUN go mod download

COPY repository_after/ ./repository_after/
COPY repository_after/ .

COPY tests/ ./tests/
COPY evaluation/ ./evaluation/

# Run app tests by default
CMD ["go", "test", "-v", "./tests/..."]
