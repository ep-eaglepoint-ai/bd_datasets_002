# ---- builder: install deps and compile TS to JS ----
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --progress=false

COPY . .
RUN npx tsc

# ---- runner: prod deps only, run compiled JS ----
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --progress=false

COPY --from=builder /app/dist ./dist

CMD ["node", "--expose-gc", "dist/evaluation/evaluation.js"]
