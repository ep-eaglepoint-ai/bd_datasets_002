FROM python:3.11-alpine

WORKDIR /app

# Copy all files
COPY . .

# Make evaluation script executable
RUN chmod +x evaluation/evaluation.py

# Default command runs evaluation
CMD ["python", "evaluation/evaluation.py"]
