# 1AP159: run repository_after (multi-file upload chat) on port 3000
FROM node:20-alpine

WORKDIR /app

COPY repository_after/ ./
RUN npm ci || npm install

ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start"]
