FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache git
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache git
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/repository_after ./repository_after
COPY --from=builder /app/repository_before ./repository_before
COPY --from=builder /app/jest.config.js ./
COPY --from=builder /app/jest.setup.ts ./
COPY --from=builder /app/tests ./tests
COPY --from=builder /app/evaluation ./evaluation
COPY --from=builder /app/instances ./instances
COPY --from=builder /app/trajectory ./trajectory
COPY --from=builder /app/Dockerfile ./
COPY --from=builder /app/docker-compose.yml ./
COPY --from=builder /app/.dockerignore ./
EXPOSE 3000
CMD ["npm", "run", "start"]
