FROM node:18-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --progress=false

# Copy the rest of the source
COPY . .

# Ensure ts-node can run TypeScript
# (npm ci installs devDependencies by default, so this is safe)
ENV NODE_ENV=development

CMD ["node", "--expose-gc", "-r", "ts-node/register", "evaluation/evaluation.ts"]
