FROM node:18-alpine

WORKDIR /app

# Copy everything
COPY . /app

# Install dependencies
RUN npm install

# Run tests
CMD ["npm", "test"]

