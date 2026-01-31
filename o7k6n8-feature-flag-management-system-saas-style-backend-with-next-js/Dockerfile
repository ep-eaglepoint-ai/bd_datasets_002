FROM node:18-bookworm

WORKDIR /app

# Copy only the root-level package.json and tsconfig.json
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy application code from repository_after
COPY repository_after/ ./repository_after/

# Copy tests and evaluation to root
COPY tests/ ./tests/
COPY evaluation/ ./evaluation/

# Generate Prisma client using the schema from repository_after
RUN npx prisma generate --schema=repository_after/prisma/schema.prisma

# Expose the application port
EXPOSE 3000

# Default command - run from repository_after directory
CMD ["sh", "-c", "cd repository_after && npm run dev"]
