FROM node:20

WORKDIR /app/repository_after

COPY repository_after/package.json ./package.json
COPY repository_after/package-lock.json ./package-lock.json
COPY repository_after/ ./

# Install all dependencies including optional native bindings required by oxc-parser and rollup
RUN npm install --include=optional --no-audit --no-fund
# Explicitly install rollup's optional native binding for Linux x64 (fixes npm optional deps bug)
RUN npm install @rollup/rollup-linux-x64-gnu --save-optional --no-audit --no-fund || true
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
