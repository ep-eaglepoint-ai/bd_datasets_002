FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Set PYTHONPATH so tests can import from repository_after
ENV PYTHONPATH=/app

# Default command
CMD ["python", "evaluation/evaluation.py"]