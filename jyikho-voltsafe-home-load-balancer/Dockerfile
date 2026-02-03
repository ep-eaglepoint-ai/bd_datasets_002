FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files
COPY . .

# Set Python path
ENV PYTHONPATH=/app/repository_after/backend:/app

CMD ["python", "evaluation/evaluation.py"]