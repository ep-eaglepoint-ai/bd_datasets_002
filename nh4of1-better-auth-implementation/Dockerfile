FROM node:20-slim
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

# Install dependencies for the project and tests/evaluation
RUN npm install
RUN cd repository_after && npm install
RUN cd tests && npm install

# Default command (can be overridden)
CMD ["npm", "test", "--prefix", "tests"]
