FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY jest.config.js babel.config.js ./
COPY tests/ ./tests/
COPY evaluation/ ./evaluation/
COPY repository_before/ ./repository_before/
COPY repository_after/ ./repository_after/

RUN npm install

CMD ["node", "evaluation/evaluation.js"]
