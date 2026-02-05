# LJWMAP - Notification Rules Engine – Trigger-Based Alerts System (Next.js)

### Test repository_before/

docker compose run --rm app sh -c "npx vitest run --root repository_before || true"

### Test repository_after


docker compose run --rm app sh -c "export DATABASE_URL=file:/app/repository_after/prisma/dev.db && cd repository_after && npx prisma db push && npx vitest run"

### Generate evaluation report


docker compose run --rm app node evaluation/evaluation.js