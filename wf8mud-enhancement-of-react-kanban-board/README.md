# WF8MUD - Enhancement of React Kanban Board

**Category:** sft

### Docker Commands

1. **Run tests on repository_before (baseline)**
   ```bash
   docker compose run --rm -e REPO_PATH=repository_before app npm test
   ```

2. **Run tests on repository_after (solution)**
   ```bash
   docker compose run --rm -e REPO_PATH=repository_after app npm test
   ```

3. **Run evaluation and generate report**
   ```bash
   docker compose run --rm app npm run evaluation
   ```