FROM node:20-slim

WORKDIR /app

# Install dependencies
ENV NODE_ENV=development
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Default command
CMD ["npm", "test"]
