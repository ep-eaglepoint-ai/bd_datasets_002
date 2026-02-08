FROM node:18-alpine

WORKDIR /app

# Copy root package.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy test and evaluation files
COPY tests/ ./tests/
COPY evaluation/ ./evaluation/

# Default to running evaluation
CMD ["npm", "run", "evaluate"]
