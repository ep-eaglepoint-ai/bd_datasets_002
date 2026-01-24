FROM node:20-slim

WORKDIR /app

# Install system dependencies needed by Playwright (with retry logic)
# Playwright will install most deps via --with-deps, but we need basic tools
RUN apt-get update || true \
  && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/* || true

# Copy package files first for better caching
COPY repository_after/tests/package*.json ./repository_after/tests/
COPY tests/package*.json ./tests/
COPY evaluation/package*.json ./evaluation/

# Install Node.js dependencies
RUN cd repository_after/tests && npm install || true
RUN cd tests && npm install || true
RUN cd evaluation && npm install || true

# Install a simple HTTP server package for serving files (alternative to Python)
RUN npm install -g http-server || true

# Install Playwright browsers - only Chromium since that's what we use
# This must happen after npm install
RUN cd repository_after/tests && npx playwright install chromium --with-deps || echo "Playwright chromium install completed with warnings" || true
RUN cd tests && npx playwright install chromium --with-deps || echo "Playwright chromium install completed with warnings" || true

# Verify Playwright installation
RUN cd repository_after/tests && npx playwright --version || echo "Playwright version check" || true

# Copy all files
COPY . .

# Make evaluation script executable
RUN chmod +x evaluation/evaluation.js || true

# Default command runs evaluation
CMD ["node", "evaluation/evaluation.js"]
