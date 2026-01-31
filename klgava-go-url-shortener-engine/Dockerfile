FROM golang:1.23-alpine
RUN apk add --no-cache build-base git
ENV CGO_ENABLED=1
WORKDIR /app
COPY . .
CMD ["echo", "Go URL Shortener Engine is set up."]
