FROM node:20-alpine

WORKDIR /app

# Copy root package files and install dependencies
COPY package*.json ./
RUN npm install || true

# Copy package files and install dependencies for the server
COPY repository_after/server/package*.json ./repository_after/server/
RUN cd repository_after/server && npm install

# Copy package files and install dependencies for the client
COPY repository_after/client/package*.json ./repository_after/client/
RUN cd repository_after/client && npm install

# Copy all files
COPY . .

CMD ["node", "evaluation/evaluation.js"]