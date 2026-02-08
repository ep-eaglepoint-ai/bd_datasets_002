FROM node:18-alpine

WORKDIR /app
COPY repository_after/package*.json ./
RUN npm install
COPY repository_after/ .
CMD ["npm", "run", "build"]
