FROM node:22

WORKDIR /app

# Install build essentials for native modules (e.g. crypto)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install dependencies
RUN npm install

COPY . .

# Set environment variables
ENV NODE_ENV=test
ENV MONGODB_URI=mongodb://mongodb:27017
ENV DB_NAME=study_planner_test

# Run tests and evaluation directly
CMD npm test && npx ts-node evaluation/evaluation.ts
