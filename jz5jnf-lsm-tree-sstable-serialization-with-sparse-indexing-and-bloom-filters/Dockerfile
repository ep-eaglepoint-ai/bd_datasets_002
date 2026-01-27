FROM golang:1.21-alpine

WORKDIR /app

# Install git (needed for go modules)
RUN apk add --no-cache git

# Copy source code
COPY . .

# Download dependencies
RUN go mod download

CMD ["go", "test", "./tests/..."]
