FROM golang:1.21-alpine
WORKDIR /app
COPY . .
RUN go mod tidy
CMD ["echo", "Go URL Shortener Engine is set up."]
