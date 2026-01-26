FROM node:18-slim

WORKDIR /app

# Copy package files
COPY repository_after/package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY repository_after/ ./

# Build the Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
