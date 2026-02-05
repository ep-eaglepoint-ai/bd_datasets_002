# Use Go 1.23 base image
FROM golang:1.23

# Set working directory
WORKDIR /app

# Copy the source code (repository_after contents become root of app)
COPY repository_after/ .

# Copy the tests folder into the app
COPY tests/ ./tests

# Copy the evaluation folder into the app
COPY evaluation/ ./evaluation

# Run tests specifically in the tests directory
CMD ["go", "test", "-v", "./tests/..."]
