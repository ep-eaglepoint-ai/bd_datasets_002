FROM node:20-alpine

WORKDIR /app

# Copy and install repository_before
COPY repository_before/package*.json ./repository_before/
RUN cd repository_before && npm install

# Copy and install repository_after
COPY repository_after/package*.json ./repository_after/
RUN cd repository_after && npm install

# Copy and install tests
COPY tests/package*.json ./tests/
RUN cd tests && npm install

# Copy root package.json and install
COPY package.json ./
RUN npm install --ignore-scripts 2>/dev/null || true

# Copy ALL source files LAST (after npm install)
COPY . .

# Default command
CMD ["node", "evaluation/evaluation.js"]