FROM golang:1.21-alpine

WORKDIR /app

RUN apk add --no-cache git

COPY . .

# Initialize go modules
RUN cd /app/repository_before && go mod download || true
RUN cd /app/repository_after && go mod download || true
RUN cd /app/tests && go mod download || true

CMD ["go", "run", "/app/evaluation/evaluation.go"]