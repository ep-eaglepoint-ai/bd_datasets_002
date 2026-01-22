## Commands

### Run the build image
```bash
docker compose build app
``` 

### Run repository_before
```bash
docker compose run --rm -e REPO_PATH=repository_before app npm test
```

### Run repository_after
```bash
docker compose run --rm -e REPO_PATH=repository_after app npm test
```

### Run evaluation
```bash
docker compose run --rm app npx ts-node evaluation/evaluation.ts
```


