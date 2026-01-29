# Optimized Dockerfile for Go testing and Python evaluation

# Common base stage for all services
FROM golang:1.21-alpine AS base
RUN apk add --no-cache git python3 py3-pip && \
    ln -sf python3 /usr/bin/python && \
    ln -sf pip3 /usr/bin/pip

WORKDIR /workspace
ENV GO111MODULE=on CGO_ENABLED=0 GOWORK=off

# Test stage for repository_before
FROM base AS test-before
COPY repository_before/ ./repository_before/
COPY tests/ ./tests/
RUN cd tests/unit && sed -i 's|repository_after|repository_before|g' go.mod
WORKDIR /workspace/tests/unit
CMD ["go", "test", "-v", "."]

# Test stage for repository_after
FROM base AS test-after
COPY repository_after/ ./repository_after/
COPY tests/ ./tests/
WORKDIR /workspace/tests/unit
CMD ["go", "test", "-v", "."]

# Evaluation stage
FROM base AS evaluation
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt --break-system-packages
COPY . .
CMD ["python", "evaluation/evaluation.py"]
