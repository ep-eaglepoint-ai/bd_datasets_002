FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache git
COPY repository_after/package.json repository_after/package-lock.json ./repository_after/
WORKDIR /app/repository_after
RUN npm ci

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache git
ENV NODE_ENV=production
COPY --from=deps /app/repository_after/node_modules ./repository_after/node_modules
# Also expose dependencies at the workspace root so code in repository_before
# can resolve modules like "stripe" when imported from tests.
COPY --from=deps /app/repository_after/node_modules ./node_modules
COPY . .

# Default command runs root-level meta tests.
# Target repository is controlled via REPO_PATH env var.
CMD ["node", "repository_after/node_modules/jest/bin/jest.js", "--runInBand", "tests/meta-requirements.test.ts"]
