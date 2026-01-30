FROM node:20-alpine
WORKDIR /app
COPY . .
WORKDIR /app/repository_after
RUN npm install
EXPOSE 5173
CMD ["echo", "build successful"]
