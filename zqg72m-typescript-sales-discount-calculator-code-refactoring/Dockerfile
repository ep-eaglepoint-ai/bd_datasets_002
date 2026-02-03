FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.json jest.config.js ./
COPY repository_after ./repository_after
COPY repository_before ./repository_before
COPY tests ./tests
COPY evaluation ./evaluation
RUN npm install --verbose
CMD ["npm", "run", "test-repo"]
