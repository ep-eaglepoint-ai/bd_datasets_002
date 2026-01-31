FROM golang:1.18-alpine AS golang

WORKDIR /src

# Copy the whole repository into the image so tests can reference the local module
COPY . .

WORKDIR /src/tests

# Run the tests for the ./after/... package
RUN go test ./after/...
