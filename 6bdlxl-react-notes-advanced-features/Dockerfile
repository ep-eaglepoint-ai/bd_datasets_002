FROM node:20-alpine

WORKDIR /app

# Copy root package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy package files and install dependencies for the server
COPY repository_after/package*.json ./repository_after/server/
RUN cd repository_after && npm install

# Copy all files
COPY . .

CMD ["node", "evaluation/evaluation.js"]