FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_ENV=test
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres
ENV DB_NAME=events

CMD ["echo", "Use: docker-compose run --rm app npm run test:before | npm run test:after | npx ts-node evaluation/evaluation.ts"]
