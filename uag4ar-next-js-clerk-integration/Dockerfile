FROM node:18-slim
WORKDIR /app
COPY . /app
RUN npm install
CMD sh -c "if [ \"$RUN_EVALUATION\" = \"true\" ]; then npm run evaluate; else npm test; fi"
