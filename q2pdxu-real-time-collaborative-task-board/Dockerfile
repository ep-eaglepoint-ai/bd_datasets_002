# Build stage for Go backend
FROM golang:1.21-alpine AS go-builder
WORKDIR /app
COPY repository_after/server/go.* ./
RUN go mod download
COPY repository_after/server/ ./
RUN go build -o main .

# Build stage for React frontend
FROM node:20-alpine AS node-builder
WORKDIR /app
COPY repository_after/client/package*.json ./
RUN npm install
COPY repository_after/client/ ./
RUN npm run build

# Stage for running tests and evaluation
FROM golang:1.21-alpine AS test-runner
WORKDIR /app
COPY . .
# Pre-download dependencies for faster runs
RUN cd tests && go mod download
RUN cd evaluation && go mod download

# Runtime stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates nodejs npm
WORKDIR /app
COPY --from=go-builder /app/main /app/server/main
COPY --from=node-builder /app /app/client
CMD ["/app/server/main"]