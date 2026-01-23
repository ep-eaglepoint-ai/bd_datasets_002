FROM node:20-slim

# Install all system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openssl \
        curl \
        python3 \
        python3-pip \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

COPY . .
RUN npm ci

RUN pip install --no-cache-dir --break-system-packages -r requirements.txt


WORKDIR /app/repository_after/local-file-organizer
RUN npm ci && \
    npx prisma generate

# Return to root
WORKDIR /app


ENV NODE_ENV=development
ENV TEST_DATA_DIR=/data
ENV DATABASE_URL=file:./dev.db

COPY <<'EOF' /entrypoint.sh
#!/bin/sh
set -e

MODE="${MODE:-test}"
REPO_PATH="${REPO_PATH:-/app/repository_after/local-file-organizer}"

echo "=========================================="
echo "Mode: $MODE"
echo "Repository: $REPO_PATH"
echo "=========================================="

case "$MODE" in
  app-before)
    echo "Starting mock server for repository_before (no implementation)..."
    node -e "
      require('http').createServer((req, res) => {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Not implemented' }));
      }).listen(3000, () => console.log('Mock server running on port 3000'));
    "
    ;;
    
  app-after)
    echo "Starting repository_after app..."
    cd "$REPO_PATH"
    npx prisma db push
    exec npm run dev
    ;;
    
  test)
    echo "Running tests against $APP_URL..."
    cd /app
    exec npx jest tests --runInBand --forceExit
    ;;
    
  evaluation)
    echo "Running evaluation..."
    cd /app
    exec python evaluation/evaluation.py
    ;;
    
  *)
    echo "Unknown mode: $MODE"
    echo "Valid modes: app-before, app-after, test, evaluation"
    exit 1
    ;;
esac
EOF

RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
