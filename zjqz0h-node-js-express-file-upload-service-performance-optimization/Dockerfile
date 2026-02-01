FROM node:20-slim

WORKDIR /app

COPY repository_after/package.json ./package.json
RUN npm install

COPY repository_after/ .
COPY tests/ ./tests/

ENV DB_HOST=db
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres
ENV DB_NAME=uploads_db

CMD ["echo", "build successful"]
