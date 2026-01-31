FROM node:22-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

# Install app dependencies
COPY repository_after/personal-expense-tracker/package*.json ./repository_after/personal-expense-tracker/
RUN cd repository_after/personal-expense-tracker && npm install

COPY . .

# Generate prisma client
RUN cd repository_after/personal-expense-tracker && npx prisma generate

CMD ["npm", "test"]
