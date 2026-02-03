FROM golang:1.21

WORKDIR /app
COPY . /app

RUN mkdir -p /app/evaluation/reports

WORKDIR /app/repository_after
RUN go mod tidy

WORKDIR /app/tests
RUN go mod tidy

WORKDIR /app/evaluation
RUN go mod tidy

WORKDIR /app
CMD ["sh", "-c", "cd /app/evaluation && go run evaluation.go"]
