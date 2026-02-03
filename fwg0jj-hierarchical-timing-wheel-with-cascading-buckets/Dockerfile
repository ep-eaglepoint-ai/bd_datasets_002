FROM golang:1.21-alpine

# Install git for version info
RUN apk add --no-cache git

WORKDIR /app
COPY . /app

# Create reports directory
RUN mkdir -p /app/evaluation/reports

# Initialize modules
WORKDIR /app/repository_after
RUN go mod tidy

WORKDIR /app/tests
RUN go mod tidy

WORKDIR /app/evaluation
RUN go mod tidy

WORKDIR /app
CMD ["sh", "-c", "cd /app/evaluation && go run evaluation.go"]