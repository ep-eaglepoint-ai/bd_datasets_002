FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev"]