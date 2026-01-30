FROM golang:1.21

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Create alias for python
RUN ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# Copy Go module files and download dependencies
COPY repository_before/go.mod repository_before/go.sum ./repository_before/
COPY repository_after/go.mod repository_after/go.sum ./repository_after/
RUN cd repository_before && go mod download
RUN cd repository_after && go mod download

# Copy the rest of the application
COPY . .

# Set default command to run the evaluation
CMD ["python", "evaluation/evaluation.py"]
