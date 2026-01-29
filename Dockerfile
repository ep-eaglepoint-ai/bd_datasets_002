FROM node:20-alpine

# Leverage layer caching for OS packages
RUN apk add --no-cache python3 py3-pip make g++ && \
    ln -sf python3 /usr/bin/python

WORKDIR /app

# Leverage layer caching for Node dependencies
COPY package*.json ./
RUN npm install

# Leverage layer caching for Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --break-system-packages pytest pytest-json-report

# Copy source code last to maximize cache hits
COPY . .

CMD ["npm", "test"]