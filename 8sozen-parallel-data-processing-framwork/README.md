# 8SOZEN - parallel-data-processing-framwork

```bash
docker compose run --rm app mvn clean test
```

```bash
docker compose run --rm app mvn clean compile exec:java -Dexec.mainClass=com.eaglepoint.parallel.Evaluation -q
```