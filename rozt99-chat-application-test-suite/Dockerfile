FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies for the client
COPY repository_after/package*.json ./repository_after/
RUN cd repository_after && npm install

# Copy all files
COPY . .

CMD ["node", "evaluation/evaluation.js"]