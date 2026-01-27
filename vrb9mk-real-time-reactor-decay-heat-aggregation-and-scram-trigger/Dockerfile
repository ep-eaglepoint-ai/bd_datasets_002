FROM golang:1.21-alpine

WORKDIR /app
COPY . /app

# Install git and build tools required for `go test -race` (cgo + compiler)
RUN apk add --no-cache git build-base

# Enable cgo so that the race detector can run
ENV CGO_ENABLED=1
