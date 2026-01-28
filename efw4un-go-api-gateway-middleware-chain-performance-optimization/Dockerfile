FROM golang:1.24-bookworm
WORKDIR /app
COPY . .
# Download dependencies if needed (go.work handles it locally, but inside docker we might need a build step if we were building)
# For running go test directly, just copying is enough if GOPATH/GOCACHE are handled or if we just run it.
CMD ["go", "test", "-v", "./tests/..."]
