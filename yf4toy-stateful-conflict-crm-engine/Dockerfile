# This Dockerfile is for evaluation/testing only
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Install Go for running tests
COPY --from=golang:1.21 /usr/local/go /usr/local/go
ENV PATH="/usr/local/go/bin:${PATH}"

COPY evaluation/ /app/evaluation/
COPY tests/ /app/tests/
COPY repository_before/ /app/repository_before/
COPY repository_after/ /app/repository_after/
CMD ["python", "evaluation/evaluation.py"]
