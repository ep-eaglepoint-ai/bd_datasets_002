FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY repository_after/go.mod repository_after/go.sum ./
RUN go mod download

COPY repository_after/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o claims-processor .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/claims-processor .
COPY tests/ ./tests/

CMD ["./claims-processor"]
