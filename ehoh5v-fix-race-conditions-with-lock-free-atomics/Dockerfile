FROM node:22-slim

WORKDIR /app

# Copy everything
COPY tests/ ./tests/
COPY repository_before/ ./repository_before/
COPY repository_after/ ./repository_after/
COPY evaluation/ ./evaluation/

# Install test dependencies
WORKDIR /app/tests
RUN npm install

# Initialise Prisma in repository_after
WORKDIR /app/repository_after
RUN npm install
RUN npx prisma generate
RUN npx prisma db push

WORKDIR /app

# Default command
CMD ["node", "evaluation/evaluation.js"]
