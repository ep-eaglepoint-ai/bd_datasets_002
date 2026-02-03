FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* jest.config.js tsconfig.json ./
COPY repository_after ./repository_after
COPY repository_before ./repository_before
COPY tests ./tests
COPY evaluation ./evaluation
RUN npm install --legacy-peer-deps --verbose && npm install --save-dev @types/node @types/uuid --legacy-peer-deps
CMD ["npm", "run", "test-repo"]
