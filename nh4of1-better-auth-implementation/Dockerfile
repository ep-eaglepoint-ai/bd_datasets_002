FROM node:20-slim

WORKDIR /app

COPY . .

# Install dependencies for the project and tests/evaluation
RUN cd repository_after && npm install
RUN cd tests && npm install

# Default command (can be overridden)
CMD ["npm", "test", "--prefix", "tests"]
