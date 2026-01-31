FROM golang:1.21-alpine

WORKDIR /app

# Install git (needed for go modules)
RUN apk add --no-cache git

# Create entrypoint script that auto-generates go.mod
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'set -e' >> /entrypoint.sh && \
    echo 'cd /app' >> /entrypoint.sh && \
    echo 'if [ ! -f go.mod ]; then' >> /entrypoint.sh && \
    echo '  echo "Creating go.mod..."' >> /entrypoint.sh && \
    echo '  go mod init github.com/ep-eaglepoint-ai/bd_datasets_002/jz5jnf-lsm-tree-sstable-serialization-with-sparse-indexing-and-bloom-filters' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    echo 'echo "Running go mod tidy..."' >> /entrypoint.sh && \
    echo 'go mod tidy' >> /entrypoint.sh && \
    echo 'exec "$@"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

# Copy source code
COPY . .

# Auto-generate go.mod if it doesn't exist (for build cache)
RUN if [ ! -f go.mod ]; then \
    go mod init github.com/ep-eaglepoint-ai/bd_datasets_002/jz5jnf-lsm-tree-sstable-serialization-with-sparse-indexing-and-bloom-filters; \
    go mod tidy; \
    fi

CMD ["go", "test", "./tests/..."]
