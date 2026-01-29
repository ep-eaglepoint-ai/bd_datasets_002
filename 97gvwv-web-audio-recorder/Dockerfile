# FROM python:3.11-slim
# WORKDIR /app
# COPY . /app
# RUN pip install --no-cache-dir -r requirements.txt
# CMD ["pytest", "-q", "tests"]

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for audio/WebRTC testing (if needed)
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port for web server
EXPOSE 8000

# Set default command
CMD ["python", "repository_after/audio_recorder.py"]