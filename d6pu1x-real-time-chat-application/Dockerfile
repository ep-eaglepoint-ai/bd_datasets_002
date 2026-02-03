FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN echo "Invalidate cache v2"
# Install dependencies
ENV NODE_ENV=development
RUN npm install --no-cache
COPY . .
CMD ["npm", "test"]
