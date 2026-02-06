FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache git && npm config set yes true

# Install ts-node globally once
RUN npm install -g ts-node typescript

COPY package.json tsconfig.json ./
RUN npm install

COPY . .

# Install dependencies for repository_after
WORKDIR /app/repository_after
RUN npm install

WORKDIR /app

CMD ["npm", "run", "evaluate"]
