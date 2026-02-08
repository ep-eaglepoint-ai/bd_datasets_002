FROM golang:1.25

WORKDIR /app

# Copy all files (respects .dockerignore)
COPY . .

# Download dependencies (repository directories are now available for replace directives)
RUN go mod download

# Set default command
CMD ["/bin/bash"]
