#!/bin/bash

# Create a simple test image for evaluation
echo "Creating test evaluation image..."

cat > Dockerfile.test << 'EOF'
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY evaluation/ evaluation/
COPY tests/ tests/

CMD ["python", "evaluation/evaluation.py", "--json-output", "evaluation/results.json"]
EOF

# Build and push the test image
docker build -f Dockerfile.test -t hailu3548/jr2pzv-app:robust-report .
docker push hailu3548/jr2pzv-app:robust-report

echo "Test image created and pushed successfully"
