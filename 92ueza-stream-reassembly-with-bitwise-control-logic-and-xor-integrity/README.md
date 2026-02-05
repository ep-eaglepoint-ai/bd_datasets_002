# 92UEZA - Stream Reassembly with Bitwise Control Logic and XOR Integrity

## Run Tests (repository_after - expected PASS)
```bash
docker compose run --rm app-after
```

## Run Evaluation
```bash
docker compose run --rm evaluation
```

## Generate Patch
```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```
