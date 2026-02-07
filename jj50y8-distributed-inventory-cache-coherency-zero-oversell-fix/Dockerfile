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

# Install Node dependencies
RUN cd repository_before && npm install
RUN cd repository_after && npm install

# Copy all files
COPY . .

# Make scripts executable
RUN chmod +x evaluation/evaluation.js || true
RUN chmod +x tests/test-runner.js || true

# Default command runs evaluation
CMD ["node", "evaluation/evaluation.js"]
