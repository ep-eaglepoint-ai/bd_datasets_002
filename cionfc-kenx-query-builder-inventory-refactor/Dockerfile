FROM node:20
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y git socat && rm -rf /var/lib/apt/lists/*

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Default command
CMD ["npm", "test"]
