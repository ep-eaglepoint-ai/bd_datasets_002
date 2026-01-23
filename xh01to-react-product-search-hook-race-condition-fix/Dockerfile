FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* jest.config.js tsconfig.json ./
COPY repository_after ./repository_after
COPY repository_before ./repository_before
COPY tests ./tests
RUN npm install --legacy-peer-deps --verbose
CMD ["npm", "run", "test-repo"]
