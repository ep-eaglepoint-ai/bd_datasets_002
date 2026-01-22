FROM node:18-slim

WORKDIR /app

# Install Playwright and system dependencies in one layer
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package.json ./

# Install root dependencies (ensure devDependencies are installed)
# Explicitly set NODE_ENV to ensure devDependencies are installed
RUN NODE_ENV=development npm install --no-audit --no-fund

# Verify playwright is installed before proceeding
RUN node -e "require('playwright'); console.log('Playwright found')" || (echo "ERROR: playwright not found after npm install" && npm list playwright && exit 1)

# Install Playwright browsers (cache this layer)
RUN npx playwright install chromium
RUN npx playwright install-deps chromium || true

# Copy project files (node_modules will be preserved from previous layer due to .dockerignore)
COPY . /app

# Final verification that playwright is still available
RUN node -e "require('playwright'); console.log('Playwright verified after COPY')" || (echo "ERROR: playwright not found after COPY" && exit 1)

# Default command
CMD ["npm", "test"]
