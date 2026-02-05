# OF5O9G - Optimizing a Highly Inefficient String Concatenation Function in Go

## Before Optimization
```bash
docker compose run --rm app go test -run TestEfficiencyBefore ./tests
```
## After Optimization
```bash
docker compose run --rm app go test -run TestEfficiencyAfter ./tests
```
## Evaluation
```bash
docker compose run --rm app go run evaluation/evaluation.go 
```