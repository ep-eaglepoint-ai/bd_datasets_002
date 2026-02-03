# ZQG72M - TypeScript Sales Discount Calculator Code Refactoring

### Docker Testing and Evaluation Commands

Test repository_before:
```bash
docker-compose run --rm -e REPO=before app
```

Test the repository_after:
```bash
docker-compose run --rm -e REPO=after app
```

To run evaluation:

```
 docker-compose run --rm app npm run evaluate
```