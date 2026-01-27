FROM node:20-slim

WORKDIR /app

# Install root dependencies (Vitest, etc.)
COPY package.json package-lock.json ./
RUN npm ci

# Install app dependencies
COPY repository_after/package.json ./repository_after/
RUN cd repository_after && npm install

# Copy everything else
COPY . .

# Default test command
CMD ["npm", "test"]