FROM node:18-alpine

WORKDIR /app
COPY . .

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Build the app for production
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]