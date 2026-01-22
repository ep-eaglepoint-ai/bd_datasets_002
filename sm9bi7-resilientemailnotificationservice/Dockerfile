FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . /app
CMD ["echo", "Resilient Email Notification Service"]
