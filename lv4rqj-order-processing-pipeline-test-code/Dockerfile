FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . /app

ENV NODE_ENV=development
ENV NODE_PATH=/app/repository_before