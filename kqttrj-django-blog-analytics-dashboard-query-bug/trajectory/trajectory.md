# Trajectory

## Phase 1: Analysis

Examined the `analytics_views.py` file containing `get_dashboard_stats()` and `get_author_stats()` functions. Identified 6 distinct query bugs in the dashboard aggregation logic:

1. **Top Authors** — `Count('posts')` counts all posts regardless of status or soft-delete. Authors with only deleted/draft posts appear with inflated counts.
2. **Recent Comments** — No filtering on `post__is_deleted` or `post__status`, so comments on deleted and unpublished posts appear.
3. **Category Stats** — `Count('posts')` includes all posts and may produce duplicates due to ManyToMany join without `distinct=True`.
4. **Date Range** — Uses `__gt`/`__lt` (exclusive) instead of `__gte`/`__lte` (inclusive), missing boundary posts.
5. **Draft Filter** — `exclude(status='archived')` still includes published posts. Should be `filter(status='draft')`.
6. **Soft Delete Global** — `Post.objects.all()` never filters `is_deleted=False`, leaking deleted posts into filtered results.
7. **Author Stats** — `get_author_stats()` counts deleted posts in `total_posts` and `total_comments`.

## Phase 2: Design

**Fix strategy** — All fixes are query-level changes in `analytics_views.py`. No model changes needed.

- Top Authors: Use `Count('posts', filter=Q(posts__status='published', posts__is_deleted=False))` with `.filter(post_count__gt=0)`
- Recent Comments: Add `post__is_deleted=False, post__status='published'` to the filter chain
- Category Stats: Add `filter=Q(...)` and `distinct=True` to the `Count()` call
- Date Range: Change `__gt`/`__lt` to `__gte`/`__lte`
- Draft Filter: Replace `exclude(status='archived')` with `filter(status=status_filter)` for all cases
- Soft Delete: Change `Post.objects.all()` to `Post.objects.filter(is_deleted=False)`
- Author Stats: Add `is_deleted=False` to all post queries and comment post lookups

## Phase 3: Implementation

Applied all 7 fixes to `repository_after/analytics_views.py`. Key changes:

1. **Line 11-15**: Added conditional `Count` with `Q` filter for published non-deleted posts, plus `.filter(post_count__gt=0)` to exclude zero-count authors.
2. **Line 28-31**: Added `post__is_deleted=False` and `post__status='published'` to comment query.
3. **Line 44-47**: Added `filter=Q(...)` and `distinct=True` to category post count.
4. **Line 62-63**: Changed `created_at__gt` → `created_at__gte`, `created_at__lt` → `created_at__lte`.
5. **Line 67**: Replaced branching draft logic with simple `filter(status=status_filter)`.
6. **Line 57**: Changed `Post.objects.all()` to `Post.objects.filter(is_deleted=False)`.
7. **Lines 92-98**: Added `is_deleted=False` to `total_posts`, `published_posts`, and `total_comments` queries in `get_author_stats`.

## Phase 4: Testing

Wrote 26 tests in `tests/test_analytics.py` organized into two groups:

**FAIL_TO_PASS (16 tests)** — These expose the 6 bugs and fail on `repository_before`, pass on `repository_after`:
- TestTopAuthorsFiltering (4 tests): excludes deleted-only/draft-only authors, correct post counts
- TestRecentCommentsFiltering (3 tests): excludes comments on deleted/draft posts
- TestCategoryStatsFiltering (1 test): correct counts for published non-deleted only
- TestDateRangeFilter (1 test): inclusive boundary check
- TestSoftDeleteFilter (2 tests): filtered posts exclude deleted, correct total count
- TestDraftFilterLogic (2 tests): draft filter excludes published posts
- TestAuthorStatsFiltering (3 tests): author stats exclude deleted posts

**PASS_TO_PASS (10 tests)** — These pass on both versions:
- TestResponseStructure (6 tests): all API response keys and field names preserved
- TestGetAuthorStatsBasic (2 tests): nonexistent author returns None, correct key structure
- TestPublishedFilter (1 test): published status filter works
- TestCategoryStatsFiltering (1 test): no duplicate entries (passes on before too since test data doesn't trigger ManyToMany duplication)

## Phase 5: Verification

- All 26 tests pass on `repository_after`
- 16 FAIL_TO_PASS tests correctly fail on `repository_before`
- 10 PASS_TO_PASS tests pass on both versions
- API response structure unchanged (same keys, same field names)
- All fixes are query-level only — `models.py` identical in both repositories
- Django ORM used throughout, no raw SQL
