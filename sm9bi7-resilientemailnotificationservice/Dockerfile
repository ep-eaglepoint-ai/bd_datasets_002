FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Default: run evaluation (compose overrides for test-before / test-after)
CMD ["npm", "run", "evaluation"]
