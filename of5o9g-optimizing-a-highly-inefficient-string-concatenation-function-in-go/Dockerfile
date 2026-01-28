FROM golang:1.21-alpine

WORKDIR /app

# Copy only the dependency files first to leverage Docker's cache
COPY go.mod ./
# If you don't have a go.sum yet, you can comment the line below out

RUN go mod download

COPY . .

# Default command to run tests
CMD ["go", "test", "./tests", "-v"]