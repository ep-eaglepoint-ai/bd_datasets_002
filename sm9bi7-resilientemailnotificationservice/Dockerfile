FROM node:18-slim
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies 
RUN npm ci

# Copy source code
COPY . /app

# Build TypeScript
RUN npm run build

# Default command runs tests
CMD ["npm", "test"]
