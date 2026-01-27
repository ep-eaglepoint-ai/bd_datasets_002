# IUPEFJ - Real-Time Chat Message Analytics API

## Running Tests

To run tests for the repository_before
```bash
docker compose run app mvn test --repo=before
```

To run tests for the repository_after
```bash
docker compose run app mvn test --repo=after
```

To run evaluation
```bash
docker compose run app sh -c 'cd evaluation && javac evaluation.java && cd .. && java -cp evaluation evaluation'
```
