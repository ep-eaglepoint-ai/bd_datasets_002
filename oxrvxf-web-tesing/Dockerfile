FROM node:20-slim

WORKDIR /app

# Install system dependencies including Python for web server
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY repository_after/tests/package*.json ./repository_after/tests/
COPY tests/package*.json ./tests/

# Install npm dependencies
RUN cd repository_after/tests && npm install && \
    cd /app/tests && npm install

# Install Playwright browsers
RUN cd repository_after/tests && npx playwright install --with-deps chromium

# Copy all files and make scripts executable
COPY . .
RUN chmod +x evaluation/evaluation.js && \
    chmod +x repository_after/tests/test-runner.js && \
    chmod +x tests/test-runner.js

# Default command runs evaluation
CMD ["node", "evaluation/evaluation.js"]
