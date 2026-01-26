FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app/repository_after

CMD ["python", "-m", "pytest", "tests/", "-q", "--tb=no", "--no-header"]
