FROM golang:1.23

WORKDIR /app

COPY . .

# Run tests by default
CMD ["go", "test", "-v", "./tests/..."]
