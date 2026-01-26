FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["echo", "Docker container for distributed chat pubsub refactor"]
