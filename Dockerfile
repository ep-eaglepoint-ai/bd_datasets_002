FROM node:20-alpine

# Leverage layer caching for OS packages
RUN apk add --no-cache make g++


WORKDIR /app

# Leverage layer caching for Node dependencies
COPY package*.json ./
RUN npm install


# Copy source code last to maximize cache hits
COPY . .

CMD ["sh", "./run-tests.sh"]