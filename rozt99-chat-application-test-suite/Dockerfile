FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm install --prefix tests

CMD ["npm", "test", "--prefix", "tests"]