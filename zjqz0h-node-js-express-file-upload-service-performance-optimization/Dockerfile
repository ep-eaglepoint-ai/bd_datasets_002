FROM node:20-slim

WORKDIR /app

# Copy the shared package.json from the build context root
COPY package.json .
RUN npm install

ARG SOURCE_DIR=.
# Copy the specific source directory contents to the container root
# The build context must be the workspace root
COPY ${SOURCE_DIR}/ .

# Copy tests folder
COPY tests/ ./tests/

# Patch legacy config.js to use environment variables for DB host if it uses hardcoded localhost
# This ensures repository_before works in Docker without modifying the source file on host
RUN if [ -f config.js ]; then \
    sed -i "s/host: 'localhost'/host: process.env.DB_HOST || 'db'/g" config.js; \
    fi

ENV DB_HOST=db
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres
ENV DB_NAME=uploads_db

CMD ["npm", "start"]
