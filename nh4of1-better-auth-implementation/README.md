# NH4OF1 - better-auth-implementation

**Category:** sft

## Overview
- Task ID: NH4OF1
- Title: better-auth-implementation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: nh4of1-better-auth-implementation

## Requirements
- Authentication should be handled through better-auth (no custom adapters)
- Use MongoDB for database needs
- Username, Password and email only
- Sessions and auth states must be handled properly
- No OAuth providers
- No external Credential services
- No third party UI

## Metadata
- Programming Languages: Typescript
- Frameworks: Nextjs, Tailwind
- Libraries: better-auth
- Databases: MongoDB
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run verification tests:
  ```bash
  docker compose run --rm app npm test --prefix tests
  ```
- Run evaluation:
  ```bash
  docker compose run --rm app npx tsx evaluation/evaluation.ts
  ```
- With Docker (interactive): `docker compose up --build`

## Regenerate patch

From repo root:

```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```
## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
