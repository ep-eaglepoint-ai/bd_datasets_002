FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . /app
CMD ["echo", "Dockerfile setup complete"]
