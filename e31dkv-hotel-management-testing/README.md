# E31DKV - Hotel Management Testing

### Run primary tests
```bash
docker compose run --rm app mvn test -f /build/primary-tests/pom.xml
```

### Run meta-tests
```bash
docker compose run --rm app mvn test -f /build/meta-tests/pom.xml
```

### Run evaluation
```bash
docker compose run --rm app python3 evaluation/evaluation.py
```
