FROM node:20-alpine

WORKDIR /app

# Build argument to determine mode: before, after, or evaluation (default)
ARG MODE=evaluation
# Make MODE available at runtime
ENV MODE=$MODE

# Copy common files
COPY package*.json ./
COPY jest.config.js babel.config.js ./
COPY tests/ ./tests/

# Copy both repositories (needed for evaluation, and we can selectively use them)
COPY repository_before/ ./repository_before/
COPY repository_after/ ./repository_after/

# Copy evaluation files (needed for evaluation mode)
COPY evaluation/ ./evaluation/

RUN npm install

# Set the command based on MODE
CMD sh -c "if [ \"$MODE\" = \"before\" ]; then \
      npm run test:before; \
    elif [ \"$MODE\" = \"after\" ]; then \
      npm run test:after; \
    else \
      node evaluation/evaluation.js; \
    fi"
