FROM node:22-alpine

WORKDIR /app

COPY package.json ./

# We'll install dependencies in the command or entrypoint to handle volume mapping issues in dev
# But copying them initially is good for caching layer if we weren't mounting volumes so aggressively

COPY . .

# Expose Frontend and Backend ports
EXPOSE 3000 5000

CMD ["sh", "-c", "echo 'Use docker-compose to run this project'"]
