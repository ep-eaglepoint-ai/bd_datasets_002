# Use Node Alpine
FROM node:20-alpine

WORKDIR /app

RUN npm install jest-environment-jsdom

# Copy package.json + package-lock.json
COPY package*.json ./

# Install all dependencies + devDependencies
RUN npm install --legacy-peer-deps



# Copy everything else
COPY . .

# Install repository_after dependencies
WORKDIR /app/repository_after
RUN npm install --legacy-peer-deps

WORKDIR /app

ENV NODE_ENV=development
EXPOSE 3000

CMD ["npm", "test"]
