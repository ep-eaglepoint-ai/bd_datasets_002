FROM golang:1.21-alpine

WORKDIR /app

COPY go.mod ./
COPY go.sum* ./
COPY repository_after/go.mod ./repository_after/
COPY repository_after/go.sum* ./repository_after/

RUN go mod download || true
WORKDIR /app/repository_after
RUN go mod download || true

WORKDIR /app
COPY . .

ENV CGO_ENABLED=0

CMD ["go", "test", "-v", "./tests"]
