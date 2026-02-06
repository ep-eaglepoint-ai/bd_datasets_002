FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --no-fund --no-audit

COPY . /app

# Default command is a no-op; docker-compose services override this.
CMD ["node", "-e", "console.log('Use docker compose run test|evaluation to run checks.')"]
