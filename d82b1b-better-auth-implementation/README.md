# project template

Starter scaffold for bd dataset task.

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

---

## Template Instructions
> **Note:** The task gen team should delete this section after creating the task.

### Setup Steps

1. **Create a directory** with the format: `uuid-task_title`
   - Task title words should be joined by underscores (`_`)
   - UUID and task title should be joined with a dash (`-`)
   - Example: `5g27e7-My_Task_Title`

2. **Update `instances/instance.json`** — the following fields are empty by default; fill in appropriate values:
   - `"instance_id"`
   - `"problem_statement"`
   - `"github_url"`

3. **Update `.gitignore`** to reflect your language and library setup

4. **Add `reports/` inside `evaluation/` to `.gitignore`**
   - Each report run should be organized by date/time

---

## Reports Generation
> **Note:** The developer should delete this section after completing the task before pushing to GitHub.

When the evaluation command is run, it should generate reports in the following structure:

```
evaluation/
└── reports/
    └── YYYY-MM-DD/
        └── HH-MM-SS/
            └── report.json
```

### Report Schema

```json
{
  "run_id": "uuid",
  "started_at": "ISO-8601",
  "finished_at": "ISO-8601",
  "duration_seconds": 0.0,
  "environment": {
    "python_version": "3.x",
    "platform": "os-arch"
  },
  "before": {
    "tests": {},
    "metrics": {}
  },
  "after": {
    "tests": {},
    "metrics": {}
  },
  "comparison": {},
  "success": true,
  "error": null
}
```

The developer should add any additional metrics and keys that reflect the runs (e.g., data seeded to test the code on before/after repository).

---

## Final README Contents
> **Note:** Replace the template content above with the following sections before pushing:

1. **Problem Statement**
2. **Prompt Used**
3. **Requirements Specified**
4. **Commands:**
   - Commands to spin up the app and run tests on `repository_before`
   - Commands to run tests on `repository_after`
   - Commands to run `evaluation/evaluation.py` and generate reports
   
   > **Note:** For full-stack app tasks, the `repository_before` commands will be empty since there is no app initially.
