FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache git && npm config set yes true

COPY package.json ./
RUN npm install

COPY . .

# Install dependencies for repository_after
WORKDIR /app/repository_after
RUN npm install

WORKDIR /app

CMD ["npm", "run", "evaluate"]