FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy dependency file
COPY requirements.txt .

# Install dependencies (frozen versions)
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire project
COPY . .

# Default command
CMD ["python", "-m", "pytest", "/app/tests/comprehensive", "-v"]
