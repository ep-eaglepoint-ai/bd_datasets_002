FROM node:20-slim
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Optimized copy to leverage Docker cache
COPY package*.json ./
COPY repository_after/package*.json ./repository_after/
COPY tests/package*.json ./tests/

# Install dependencies for the project and tests/evaluation
RUN npm install
RUN cd repository_after && npm install
RUN cd tests && npm install

# Copy source code after dependencies are installed
COPY . .
CMD ["npm", "test", "--prefix", "tests"]
