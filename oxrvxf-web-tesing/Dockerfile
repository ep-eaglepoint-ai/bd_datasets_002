FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
  && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY repository_after/package*.json ./repository_after/
COPY repository_before/kanban ./repository_before/kanban
COPY repository_after/kanban ./repository_after/kanban
COPY repository_after/tests ./repository_after/tests
COPY repository_after/playwright.config.js ./repository_after/
COPY evaluation/package*.json ./evaluation/
COPY requirements.txt ./

# Install Python dependencies
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt || true

# Install Node.js dependencies
RUN cd repository_after && npm install

# Install Playwright browsers
RUN cd repository_after && npx playwright install chromium --with-deps

# Install evaluation dependencies
RUN cd evaluation && npm install || true

# Copy all files
COPY . .

# Make evaluation script executable
RUN chmod +x evaluation/evaluation.js || true

# Default command runs evaluation
CMD ["node", "evaluation/evaluation.js"]
