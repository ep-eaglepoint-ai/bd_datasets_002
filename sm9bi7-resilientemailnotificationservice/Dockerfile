FROM node:18-slim
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . /app

# Build TypeScript (optional, for production)
# RUN npm run build

# Default command runs tests
CMD ["npm", "test"]
