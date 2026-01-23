FROM node:18-slim

WORKDIR /app

# Copy package files first for better caching
COPY package.json ./

# Install root dependencies (ensure devDependencies are installed)
# Explicitly set NODE_ENV to ensure devDependencies are installed
RUN NODE_ENV=development npm install --no-audit --no-fund

# Copy project files (node_modules will be preserved from previous layer due to .dockerignore)
COPY . /app

# Pre-install dependencies for repository_before and repository_after to avoid installs during evaluation
RUN if [ -f repository_before/package.json ]; then \
      echo "Installing dependencies for repository_before..." && \
      cd repository_before && \
      npm install --no-audit --no-fund --silent && \
      cd ..; \
    fi

RUN if [ -f repository_after/package.json ]; then \
      echo "Installing dependencies for repository_after..." && \
      cd repository_after && \
      npm install --no-audit --no-fund --silent && \
      cd ..; \
    fi

# Pre-build both repositories so evaluation doesn't need to build
RUN if [ -f repository_before/package.json ]; then \
      echo "Pre-building repository_before..." && \
      cd repository_before && \
      CI=true npm run build || echo "Build failed for repository_before (expected - uses eval)" && \
      cd ..; \
    fi

RUN if [ -f repository_after/package.json ]; then \
      echo "Pre-building repository_after..." && \
      cd repository_after && \
      CI=true npm run build && \
      cd ..; \
    fi

# Default command
CMD ["npm", "test"]
