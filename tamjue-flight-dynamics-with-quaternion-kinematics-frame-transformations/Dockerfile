# Use official Golang image
FROM golang:1.21-alpine

# Set working directory
WORKDIR /app

# Install any additional dependencies if needed
RUN apk add --no-cache git

# Copy go mod files if you have them (optional, but good practice)
# COPY go.mod go.sum ./
# RUN go mod download

# Copy the entire project
COPY . .

# Default command (can be overridden)
CMD ["go", "test", "-v", "./..."]
