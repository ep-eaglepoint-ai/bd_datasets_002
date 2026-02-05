# Event Sourcing and CQRS Framework

A comprehensive event sourcing and CQRS framework built with Go 1.21+.

## Features

- **PostgreSQL Event Store**: Append-only event streams with optimistic concurrency control
- **Aggregate Framework**: Type-safe aggregate reconstruction with snapshot support
- **Command Bus**: Synchronous and asynchronous command dispatch with validation and retry
- **Projection Framework**: Event stream subscriptions with checkpointing and partitioning
- **Schema Evolution**: Upcasters for backward-compatible event schema changes
- **Transactional Outbox**: Reliable event publishing with NATS JetStream
- **Saga Coordinator**: Long-running process management with compensation
- **Observability**: Logging, metrics, event browser API, and OpenTelemetry integration

## Architecture

```
┌─────────────┐
│  Commands   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Command Bus │────▶│  Aggregates  │────▶│ Event Store │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Outbox     │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │  NATS JS     │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │ Projections  │
                                          └──────────────┘
```

## Quick Start

### Prerequisites

- Go 1.21+
- PostgreSQL 15+
- NATS Server with JetStream

### Installation

```bash
go mod download
```

### Database Setup

```bash
createdb eventstore
```

### Running Tests

```bash
go test ./...
```

### Running the Event Store Server

```bash
export DATABASE_URL="postgres://user:pass@localhost/eventstore?sslmode=disable"
go run ./cmd/eventstore
```

## Usage Examples

See `examples/account/account.go` for a complete example of an aggregate implementation.

## API Endpoints

- `GET /events` - List events with pagination
- `GET /events/aggregate/{id}` - Get events for an aggregate
- `GET /health` - Health check

## Metrics

Prometheus metrics are exposed at `/metrics` (when metrics server is configured).

## License

MIT
