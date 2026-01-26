FROM postgres:15-alpine

# Install additional tools including Python
RUN apk add --no-cache bash make python3 py3-pip

WORKDIR /app

# Copy all files
COPY . /app

# Make evaluation.py executable
RUN chmod +x evaluation/evaluation.py

# Default command runs evaluation
CMD ["python3", "evaluation/evaluation.py"]
