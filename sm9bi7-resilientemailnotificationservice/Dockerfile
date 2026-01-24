FROM node:18-slim
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies 
RUN npm install
RUN npm install -g jest cross-env

# Copy source code
COPY . /app

# Build TypeScript
RUN npm run build

# Default command runs tests
CMD ["npm", "test"]
