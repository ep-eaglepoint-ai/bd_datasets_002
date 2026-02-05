FROM golang:1.21-alpine AS base
WORKDIR /workspace
ENV CGO_ENABLED=0

# --- Test Stage: repository_before ---
FROM base AS test-before
COPY repository_before/ ./repository_before/
COPY repository_after/batch/unit_test ./repository_before/batch/unit_test
WORKDIR /workspace/repository_before/batch/unit_test

# Compatibility Patching:
RUN sed -i 's|example.com/batch-optimized|example.com/batch-standalone/batch|g' *.go && \
    sed -i 's|batch.Timer|interface{ C() <-chan time.Time; Stop() bool }|g' *.go

CMD ["/bin/sh", "-c", "go test -v . || true"]

# --- Test Stage: repository_after ---
FROM base AS test-after
COPY repository_after/ ./repository_after/
WORKDIR /workspace/repository_after/batch/unit_test
CMD ["go", "test", "-v", "."]

# --- Evaluation Stage ---
FROM base AS evaluation
RUN apk add --no-cache python3 py3-pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --break-system-packages
COPY . .
CMD ["python", "evaluation/evaluation.py"]
