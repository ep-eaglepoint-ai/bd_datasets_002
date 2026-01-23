FROM node:20-slim

WORKDIR /app

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install

COPY . .

# Default command
CMD ["npm", "test"]
