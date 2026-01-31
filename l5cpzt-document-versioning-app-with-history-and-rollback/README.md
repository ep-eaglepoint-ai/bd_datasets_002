Document Versioning App with History and Rollback

Run tests before. Expected some failures.

Command
docker run --rm -w /app hailu3548/jr2pzv-app:robust-report pytest -q

Expected behavior

Functional tests pass

Structural tests fail. This is expected before improvements

Run tests after. Expected all pass.

Command
docker run --rm -w /app hailu3548/jr2pzv-app:robust-report pytest -q

Expected behavior

Functional tests pass

Structural tests pass. Improvements are present

Run evaluation. Compares both implementations.

Command
docker run --rm hailu3548/jr2pzv-app:robust-report

This will

Run tests for before and after implementations

Run structure and equivalence checks

Produce an evaluation report in the container output

Generate patch between versions.

Command
git diff --no-index repository_before repository_after > patches/task_001.patch