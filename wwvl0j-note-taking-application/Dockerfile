FROM python:3.11-slim

# Install Node.js and dependencies for frontend testing
RUN apt-get update && apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files first to cache layers
COPY repository_after/backend/requirements.txt backend-requirements.txt
RUN pip install --no-cache-dir -r backend-requirements.txt

COPY repository_after/frontend/package.json frontend_deps/package.json
RUN cd frontend_deps && npm install --no-audit

# Copy the actual code
COPY repository_after /app/repository_after
COPY tests /app/tests
COPY evaluation /app/evaluation
COPY run-frontend-tests.sh /app/run-frontend-tests.sh

# Setup environment paths
ENV PYTHONPATH=/app/repository_after/backend
# Symlink node_modules from frontend_deps to repository_after/frontend
# Link node_modules so tests can find them
RUN ln -s /app/frontend_deps/node_modules /app/repository_after/frontend/node_modules

# Default command
CMD ["/bin/bash"]
