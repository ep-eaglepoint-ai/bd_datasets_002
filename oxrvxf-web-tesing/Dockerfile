FROM node:20-slim

WORKDIR /app

# Install system dependencies and clean up in one step
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies in parallel
COPY repository_after/tests/package*.json ./repository_after/tests/
COPY tests/package*.json ./tests/

# Install all npm dependencies and Playwright browsers in one step
RUN cd repository_after/tests && npm install && \
    npx playwright install chromium --with-deps && \
    cd /app/tests && npm install && \
    npx playwright install chromium --with-deps

# Copy all files and make scripts executable
COPY . .
RUN chmod +x evaluation/evaluation.js && \
    chmod +x repository_after/tests/test-runner.js

# Default command runs evaluation
CMD ["node", "evaluation/evaluation.js"]
