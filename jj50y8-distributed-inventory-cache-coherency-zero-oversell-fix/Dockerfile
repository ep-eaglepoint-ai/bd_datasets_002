FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    postgresql-client \
    bash \
  && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY repository_before/package*.json ./repository_before/
COPY repository_after/package*.json ./repository_after/
COPY tests/package*.json ./tests/
COPY evaluation/package*.json ./evaluation/

# Install Node dependencies
RUN cd repository_before && npm install
RUN cd repository_after && npm install
RUN cd tests && npm install
RUN cd evaluation && npm install

# Copy all files
COPY . .

# Make evaluation script executable
RUN chmod +x evaluation/evaluation.js || true

# Default command runs evaluation
CMD ["node", "evaluation/evaluation.js"]
