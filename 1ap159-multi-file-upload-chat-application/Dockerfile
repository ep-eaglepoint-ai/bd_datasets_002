# 1AP159: evaluation — run tests on repository_before and repository_after, write report
FROM node:20-alpine

WORKDIR /app

# Root: package and config
COPY package*.json ./
COPY jest.config.js babel.config.js ./

# Tests, evaluation, and both repositories (node_modules excluded via .dockerignore)
COPY tests/ ./tests/
COPY evaluation/ ./evaluation/
COPY repository_before/ ./repository_before/
COPY repository_after/ ./repository_after/

# Install root deps only (meta-tests use root's node_modules for react, jest, etc.)
RUN npm ci || npm install

CMD ["node", "evaluation/evaluation.js"]
