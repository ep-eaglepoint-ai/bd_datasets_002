# Multi-stage Dockerfile for Deterministic Financial Calculator

# Stage 1: Go server
FROM golang:1.21-alpine AS server
WORKDIR /app/server
COPY repository_after/calculator.go .
RUN go build -o calculator calculator.go
EXPOSE 8080
CMD ["./calculator"]

# Stage 2: Python test runner
FROM python:3.11-slim AS tester
WORKDIR /app
COPY tests/ ./tests/
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
CMD ["python", "tests/test_requirements.py"]

# Stage 3: Evaluation (Go + Python for CI/CD)
FROM golang:1.21-alpine AS evaluation
RUN apk add --no-cache python3 py3-pip
WORKDIR /app
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python3", "evaluation/evaluation.py"]

