FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies for the client
COPY repository_after/package*.json ./repository_after/
RUN cd repository_after && npm install

# Copy all files
COPY . .

# Move tests to the correct location for react-scripts
RUN cp tests/App.test.js repository_after/src/ && \
    cp tests/setupTests.js repository_after/src/

CMD ["node", "evaluation/evaluation.js"]