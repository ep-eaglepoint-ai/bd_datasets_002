
FROM node:20-slim AS node-base
# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app
COPY . /app
RUN npm install

CMD ["npm", "test"]
