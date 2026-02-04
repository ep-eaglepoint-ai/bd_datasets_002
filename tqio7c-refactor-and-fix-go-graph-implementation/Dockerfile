FROM golang:1.21-alpine

WORKDIR /app

# Copy all files
COPY . .

# Default command runs evaluation
CMD ["go", "run", "evaluation/evaluation.go"]
