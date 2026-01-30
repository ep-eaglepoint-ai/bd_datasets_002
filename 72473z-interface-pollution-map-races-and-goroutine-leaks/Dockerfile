FROM golang:1.20-bookworm
WORKDIR /app
COPY . .
# No requirements.txt needed for Go usually unless using CGO or specific tools
# But we'll keep the command as go run evaluation/evaluation.go
CMD ["go", "run", "evaluation/evaluation.go"]
