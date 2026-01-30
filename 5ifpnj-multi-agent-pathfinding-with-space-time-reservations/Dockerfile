FROM golang:1.18-alpine

WORKDIR /app

COPY tests/ /app/tests/
COPY repository_after/ /app/repository_after/
COPY evaluation/ /app/evaluation/

WORKDIR /app/tests
RUN go mod download || true

WORKDIR /app/evaluation
RUN go mod download || true

WORKDIR /app
