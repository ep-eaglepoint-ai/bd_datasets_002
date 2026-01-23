FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Default command to run tests
CMD ["npx", "ts-node", "tests/index.ts"]
