FROM python:3.11-slim

WORKDIR /app

# Install dependencies for local setup and reproducibility
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the standardized folder hierarchy [cite: 11]
COPY . .

# Default to the "Problem State" directory [cite: 138]
ENV PYTHONPATH="/app:/app/repository_before/src"

# Default command to verify environment integrity
CMD ["pytest", "--version"]