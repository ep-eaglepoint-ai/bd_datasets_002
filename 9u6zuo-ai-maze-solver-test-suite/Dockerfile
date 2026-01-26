# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies: assume a root package.json that includes jest & ts-jest, or
# you can run npm install in repository_before if that holds the dependencies.
# For simplicity, install jest globally (not ideal for production, but fine for this harness).
RUN npm install --global jest @types/jest ts-node typescript

# Default command: run evaluation (which in turn runs Jest)
CMD ["node", "evaluation/evaluation.js"]