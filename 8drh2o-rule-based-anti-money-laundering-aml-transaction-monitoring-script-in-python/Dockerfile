FROM python:3.11-slim

WORKDIR /app

# Copy project files into the container
COPY . /app

# Ensure tests run with only the standard library (no extra packages installed)
CMD ["python", "-m", "unittest", "discover", "-v"]
FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir -r requirements.txt
CMD ["pytest", "-q", "tests"]
