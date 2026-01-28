FROM node:20-alpine

WORKDIR /app

# Copy root package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all files
COPY . .

CMD ["node", "evaluation/evaluation.js"]