# 6ZKVSP - IoT Sensor Metrics API

**Category:** sft

## Overview
- Task ID: 6ZKVSP
- Title: IoT Sensor Metrics API
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 6zkvsp-iot-sensor-metrics-api

## Requirements
- Compute per-sensor: count, average value, and maximum reading.
- Analytics must be computed per request only and not depend on prior requests.
- Include analytics only for sensors with at least one valid reading.
- Deterministic tie-breaking for max reading when values are equal.
- Response format and field names must remain backward-compatible.
- Handle malformed or partially invalid input gracefully.
- Invalid readings must not corrupt analytics results.
- Resilient to empty input and extreme batch sizes.
- Must scale linearly; avoid unnecessary repeated work.
- Must be safe under concurrent requests; avoid shared mutable state.
- Favor clarity and maintainability; follow Spring Boot and Java best practices.

## Metadata
- Programming Languages: Java
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Commands

### Run tests on repository_before

```bash
docker compose run --rm test-before
```

### Run tests on repository_after

```bash
docker compose run --rm test-after
```

### Run evaluation

```bash
docker compose run --rm evaluation
```

