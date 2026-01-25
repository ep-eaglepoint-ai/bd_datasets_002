FROM golang:1.21-alpine

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod .
COPY . .

RUN go mod download

COPY repository_before /src/repository_before
RUN sed -i 's/go 1.25.5/go 1.21/' /src/repository_before/dblock-demo/go.mod

ENTRYPOINT ["/bin/sh", "-c", "if [ \"$TEST_TARGET\" = \"before\" ]; then echo 'Switching to repository_before (patched)...'; go mod edit -replace dblock-demo=/src/repository_before/dblock-demo; \"$@\"; echo 'Note: Suppressing exit code for repository_before (expected failures)'; exit 0; else echo 'Switching to repository_after...'; go mod edit -replace dblock-demo=./repository_after; exec \"$@\"; fi", "--"]
CMD ["go", "run", "evaluation/evaluation.go"]
