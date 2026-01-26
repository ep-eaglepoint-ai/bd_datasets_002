FROM node:18-alpine

WORKDIR /app

# Copy project
COPY . .

# Install deps in repository_before
WORKDIR /app/repository_before
RUN npm install --legacy-peer-deps 2>/dev/null

# Install deps in repository_after
WORKDIR /app/repository_after
RUN npm install --legacy-peer-deps 2>/dev/null

# Back to root
WORKDIR /app

CMD ["npm", "test"]
