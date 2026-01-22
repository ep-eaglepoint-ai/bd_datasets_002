FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache git && npm config set yes true

# Install ts-node globally once
RUN npm install -g ts-node typescript

COPY . .

# Install dependencies per project
WORKDIR /app/repository_after
RUN npm install

WORKDIR /app/tests
RUN npm install

WORKDIR /app/evaluation
RUN npm install

WORKDIR /app

CMD ["npm", "run", "evaluate"]
