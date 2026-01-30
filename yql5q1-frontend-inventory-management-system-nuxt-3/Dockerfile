FROM node:20

WORKDIR /app/repository_after

COPY repository_after/package.json ./package.json
COPY repository_after/package-lock.json ./package-lock.json
COPY repository_after/ ./

# Evaluation runner (used by docker-compose evaluation)
WORKDIR /app
COPY evaluation/ ./evaluation/

WORKDIR /app/repository_after

RUN npm ci --no-audit --no-fund

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]