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

# Install root dependencies
RUN npm install --no-audit --no-fund

# Install Playwright browsers (cache this layer)
RUN npx playwright install chromium
RUN npx playwright install-deps chromium || true

# Copy project files
COPY . /app

# Default command
CMD ["npm", "test"]
