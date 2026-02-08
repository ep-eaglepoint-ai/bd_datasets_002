FROM node:22-bullseye-slim

WORKDIR /app

# Use a Debian-based image so Playwright's browser install (apt-get) can run
# Runtime dependencies and node_modules are installed at container runtime

# Preinstall repository_after dependencies and Playwright browsers at image build
WORKDIR /app/repository_after
# Copy only package files to leverage Docker layer caching
COPY repository_after/package.json repository_after/package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --no-fund || npm install && npx playwright install --with-deps || true

# Return to top-level workdir for runtime
WORKDIR /app
