FROM node:20

WORKDIR /app

# Copy repository_after files
COPY repository_after/package.json ./repository_after/package.json
COPY repository_after/package-lock.json ./repository_after/package-lock.json
COPY repository_after/ ./repository_after/

# Copy evaluation script
COPY evaluation/ ./evaluation/

WORKDIR /app/repository_after

# Install all dependencies including optional native bindings required by oxc-parser and rollup
RUN npm install --include=optional --no-audit --no-fund
# Explicitly install rollup's optional native binding for Linux x64 (fixes npm optional deps bug)
RUN npm install @rollup/rollup-linux-x64-gnu --save-optional --no-audit --no-fund || true
# Install tsx for running TypeScript evaluation script
RUN npm install tsx --save-dev --no-audit --no-fund || true
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
