FROM golang:1.21-alpine

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod .
COPY . .

RUN go mod download

# Now download/tidy to ensure everything is ready
RUN go mod download

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
CMD ["go", "run", "evaluation/evaluation.go"]
