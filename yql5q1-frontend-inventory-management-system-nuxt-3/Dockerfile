FROM node:20-alpine

WORKDIR /app/repository_after

COPY repository_after/package.json ./package.json
COPY repository_after/package-lock.json ./package-lock.json

COPY repository_after/ ./

RUN npm install --omit=optional
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]