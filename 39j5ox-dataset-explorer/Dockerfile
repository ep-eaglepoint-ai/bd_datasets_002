FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code and configuration files
COPY repository_after ./repository_after
COPY evaluation ./evaluation
COPY tests ./tests
COPY tsconfig.json ./
COPY next.config.ts ./
COPY jest.config.js ./
COPY jest.setup.js ./
COPY eslint.config.mjs ./
COPY postcss.config.mjs ./
# COPY next-env.d.ts ./

# Expose port
EXPOSE 3000

# Default command (can be overridden)
CMD ["npm", "run", "dev"]