# Multi-stage Dockerfile for Go testing

# Build stage
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy entire project
COPY . .

# Test stage for repository_before
FROM golang:1.21-alpine AS test-before

WORKDIR /workspace

# Copy only what's needed for repository_before
COPY repository_before/ ./repository_before/
COPY tests/ ./tests/

# Set environment
ENV GO111MODULE=on \
    CGO_ENABLED=0 \
    GOWORK=off

# Override go.mod replace directive to use repository_before
RUN cd tests/unit && \
    sed -i 's|repository_after|repository_before|g' go.mod

# Run tests
WORKDIR /workspace/tests/unit
CMD ["go", "test", "-v", "."]

# Test stage for repository_after
FROM golang:1.21-alpine AS test-after

WORKDIR /workspace

# Copy only what's needed for repository_after
COPY repository_after/ ./repository_after/
COPY tests/ ./tests/

# Set environment
ENV GO111MODULE=on \
    CGO_ENABLED=0 \
    GOWORK=off

# Run tests (go.mod already points to repository_after)
WORKDIR /workspace/tests/unit
CMD ["go", "test", "-v", "."]

# Evaluation stage
FROM golang:1.21-alpine AS evaluation

# Set working directory
WORKDIR /workspace

# Copy go mod files first for better caching
COPY go.work go.work

# Copy source code
COPY . .

# Set build environment
ENV GO111MODULE=on \
    CGO_ENABLED=0

# Run evaluation
CMD ["go", "run", "evaluation/evaluation.go"]
