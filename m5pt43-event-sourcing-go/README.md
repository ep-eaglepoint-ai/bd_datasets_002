# M5PT43 - event sourcing go

## Quick Start

All dependencies are public, so no authentication is required. Simply run:

```bash
docker-compose run --rm test-after
docker-compose run --rm evaluation
```

## Docker Build (Standalone)

```bash
docker build -t eventstore:latest .
```

## Note

The module name `github.com/eaglepoint/eventstore` is used for local package imports only. All external dependencies (lib/pq, nats-io, prometheus, etc.) are public and available without authentication.
