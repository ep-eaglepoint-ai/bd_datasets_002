# E6WXTP - React Code Editor Reliability Fix

### Repository Before
```bash
docker compose run --rm app npm run test:before --prefix tests
```

### Repository After
```bash
docker compose run --rm app npm run test:after --prefix tests
```

### Evaluation
```bash
docker compose run --rm app node evaluation/evaluation.js
```
