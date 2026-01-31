FROM golang:1.22

WORKDIR /app

COPY . .

# Initialize repository_before module (create go.mod if it doesn't exist)
RUN cd /app/repository_before && \
    if [ ! -f go.mod ]; then \
        go mod init example.com/routing; \
    fi && \
    go mod tidy

# Initialize repository_after module
RUN cd /app/repository_after && \
    if [ ! -f go.mod ]; then \
        go mod init example.com/routing; \
    fi && \
    go mod tidy

# Download dependencies for tests and evaluation
RUN cd /app/tests && go mod download || true
RUN cd /app/evaluation && go mod download || true

CMD ["go", "run", "/app/evaluation/evaluation.go"]