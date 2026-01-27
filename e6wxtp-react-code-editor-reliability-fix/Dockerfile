FROM ghcr.io/puppeteer/puppeteer:21.5.0

USER root
WORKDIR /app

# Set environment
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CI=true

# Prepare directory ownership
RUN chown -R pptruser:pptruser /app

# Switch to non-root user for all subsequent operations
USER pptruser

# Copy package files first for better caching
# MUST use --chown because COPY ignores USER instruction
# Copy package files (only package.json to avoid bad lockfiles for all)
COPY --chown=pptruser:pptruser repository_before/package.json ./repository_before/
COPY --chown=pptruser:pptruser repository_after/package.json ./repository_after/
COPY --chown=pptruser:pptruser tests/package.json ./tests/

# Install dependencies
# repository_after: Force ajv@8 to start the server
# tests: Fresh install for Puppeteer 21.5.0
RUN cd repository_before && npm install --legacy-peer-deps --no-audit --no-fund && npm install ajv@8
RUN cd repository_after && npm install --legacy-peer-deps --no-audit --no-fund && npm install ajv@8
RUN cd tests && npm install --no-audit --no-fund

# Copy the rest of the application
COPY --chown=pptruser:pptruser . /app

CMD ["bash"]
