# Distributed Chat Service Refactor

## Project Context
The goal is to refactor a single-instance Node.js chat service into a distributed system using Redis Pub/Sub. The original code fails to broadcast messages between users connected to different servers.

## Commands

### 1. Setup Environment
Builds the Node.js container and installs dependencies.

```bash

docker compose run --rm -e REPO_PATH=repository_before app bash -c "npm test || true"

docker compose run --rm -e REPO_PATH=repository_after app npm test

docker compose run --rm app node evaluation/evaluation.js