FROM node:20-slim

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

# Ensure typescript is available globally or via npx
RUN npm install -g typescript ts-node

CMD ["npm", "test"]
