FROM node:18-alpine

WORKDIR /app

ARG MODE=evaluation

ENV MODE=${MODE}

RUN mkdir -p src tests reports

# Copy package.json
COPY tests/package.json ./package.json

# Copy source files
COPY repository_after/intercept.js /app/after/intercept.js

# Copy tests
COPY tests/intercept.test.js /app/tests/intercept.test.js

# Copy evaluation
COPY evaluation/evaluation.js /app/evaluation/evaluation.js

CMD if [ "$MODE" = "after" ]; then \
        mkdir -p src && \
        cp /app/after/intercept.js src/intercept.js && \
        cp /app/tests/intercept.test.js src/intercept.test.js && \
        cd src && node intercept.test.js; \
    else \
        mkdir -p src && \
        cp /app/after/intercept.js src/intercept.js && \
        cp /app/tests/intercept.test.js src/intercept.test.js && \
        cp /app/evaluation/evaluation.js src/evaluation.js && \
        cd src && node evaluation.js; \
    fi