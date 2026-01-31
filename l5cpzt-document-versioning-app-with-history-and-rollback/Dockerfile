# --- Evaluation / Test Runner ---
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install evaluation dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy everything for evaluation
COPY . .

# Default command to run evaluation
CMD ["python", "evaluation/evaluation.py"]