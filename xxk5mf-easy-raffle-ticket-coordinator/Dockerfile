FROM node:22

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY repository_after/client/package.json repository_after/client/
COPY repository_after/server/package.json repository_after/server/
COPY tests/package.json tests/
RUN npm run install:all

COPY . .

ENV NODE_ENV=test
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/raffle_test
ENV ADMIN_SECRET=test-admin-secret

# Run all tests (server, UI, functional/concurrency) then generate evaluation report
CMD ["sh", "-c", "npm test -- --runInBand && npx ts-node evaluation/evaluation.ts"]
