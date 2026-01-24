# Meeting Room Booking API - Performance Optimization

#### Test Before Version (Unoptimized)

```bash
docker-compose down -v && docker-compose up --build server-before test-before
```
#### Test After Version (Optimized)

```bash
docker-compose down -v && docker-compose up --build server-after test-after
```

#### Run Full Evaluation

```bash
docker-compose down -v && docker-compose up --build evaluate
```
