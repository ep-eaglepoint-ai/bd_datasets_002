FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Create reports directory
RUN mkdir -p evaluation/reports

# Set proper permissions
RUN chmod -R 755 /app

# Default command
CMD ["npm", "test"]
