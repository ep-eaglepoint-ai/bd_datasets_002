FROM node:20-alpine

WORKDIR /app

# Copy test configuration files
COPY package.json package-lock.json jest.config.js tsconfig.json ./
COPY tests ./tests

# Install test dependencies
RUN npm install
RUN npm install -g tsx

# Copy repository_after for the app
COPY repository_after ./repository_after

# Install app dependencies and build
WORKDIR /app/repository_after
RUN npm install
RUN npm run build

# Reset to root for tests
WORKDIR /app

# Expose port
EXPOSE 3000

# Start the production server
CMD ["sh", "-c", "cd repository_after && npm start"]
