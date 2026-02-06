FROM golang:1.20-alpine

WORKDIR /app

COPY . /app

# Use Go workspace to handle multiple modules
RUN cd /app && go work sync

# Install dependencies for tests
RUN cd /app/tests && go mod tidy

# Install dependencies for repository_after  
RUN cd /app/repository_after && go mod tidy
