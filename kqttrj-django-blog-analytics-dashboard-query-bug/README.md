# KQTTRJ - Django Blog Analytics Dashboard Query Bug

**Category:** sft

## Overview
- Task ID: KQTTRJ
- Title: Django Blog Analytics Dashboard Query Bug
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: kqttrj-django-blog-analytics-dashboard-query-bug

## Requirements
- Top Authors widget must only display authors who have at least one published post that is not deleted. Authors who only have draft, archived, or soft-deleted posts should not appear in the list.
- The post_count shown for each author in Top Authors must count only their published posts where is_deleted=False. Draft and archived posts should not be included in this count.
- Recent Comments section must filter out any comments that belong to soft-deleted posts (where post.is_deleted=True). These comments should never appear in the dashboard.
- Recent Comments section must also exclude comments on posts that are not published (where post.status is 'draft' or 'archived'). Only comments on published posts should be shown.
- Category Stats panel must not show duplicate category entries. Each category should appear exactly once in the results, even if posts have multiple categories assigned via the ManyToMany relationship.
- The post_count for each category must only include published posts that are not deleted. Draft, archived, and soft-deleted posts should not contribute to category counts.
- When users filter by date range, the results must include posts on both the start date and end date (inclusive). For example, filtering from Jan 1 to Jan 31 must include posts created on Jan 1 at 00:00:00 and Jan 31 at 23:59:59.
- All queries that return posts must exclude soft-deleted posts (is_deleted=True) by default. This applies to filtered posts list, category statistics, author statistics, and any other post-related data.
- The API response structure must remain exactly the same. All dictionary keys (top_authors, recent_comments, category_stats, filtered_posts, total_count) and their nested field names must not change.
- The database schema and model definitions in models.py cannot be modified. All fixes must be implemented in the view/query logic only.

## Metadata
- Programming Languages: Python
- Frameworks: Django
- Libraries: (none)
- Databases: (none)
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
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
