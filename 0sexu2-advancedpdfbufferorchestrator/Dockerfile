FROM docker:26-cli AS docker-cli

FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y curl

WORKDIR /app

# Copy docker binary
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/

# Install docker-compose plugin
RUN mkdir -p /usr/libexec/docker/cli-plugins \
    && curl -SL https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-linux-x86_64 -o /usr/libexec/docker/cli-plugins/docker-compose \
    && chmod +x /usr/libexec/docker/cli-plugins/docker-compose

COPY package*.json ./
RUN npm install

COPY . .

# Default command
CMD ["npx", "ts-node", "tests/index.ts"]
