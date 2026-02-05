FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project
COPY . /app/

# Default command (can be overridden in docker-compose)
CMD ["pytest", "-q", "--tb=short"]
