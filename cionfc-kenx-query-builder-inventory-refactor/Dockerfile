FROM node:20
WORKDIR /app

RUN apt-get update && apt-get install -y git socat && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "test"]
