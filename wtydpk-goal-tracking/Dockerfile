FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y git procps && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package.json and install dependencies
COPY package.json .
RUN npm install

# Copy the entire project
COPY . .

# Install tsx globally (optional if in devDependencies, but good for safety)
RUN npm install -g tsx typescript ts-node

# Ensure npx cache is set up or shared (optional, but good practice)
ENV npm_config_cache=/root/.npm

# Entrypoint keeps the container running
CMD ["tail", "-f", "/dev/null"]
