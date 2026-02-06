import os
import importlib
import pytest
from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth.models import User

REPO = os.environ.get('REPO', 'repository_after')
models = importlib.import_module(f'{REPO}.models')
views = importlib.import_module(f'{REPO}.analytics_views')

Author = models.Author
Category = models.Category
Post = models.Post
Comment = models.Comment
get_dashboard_stats = views.get_dashboard_stats
get_author_stats = views.get_author_stats


@pytest.fixture
def setup_data(db):
    """Create a rich dataset that exposes all 6 bugs."""
    user1 = User.objects.create_user('alice', 'alice@test.com', 'pass')
    user2 = User.objects.create_user('bob', 'bob@test.com', 'pass')
    user3 = User.objects.create_user('charlie', 'charlie@test.com', 'pass')

    author1 = Author.objects.create(user=user1)
    author2 = Author.objects.create(user=user2)
    author3 = Author.objects.create(user=user3)

    cat1 = Category.objects.create(name='Python', slug='python')
    cat2 = Category.objects.create(name='Django', slug='django')
    cat3 = Category.objects.create(name='Testing', slug='testing')

    # author1: 1 published, 1 deleted-published, 1 draft
    p1 = Post.objects.create(
        title='Published Post', slug='pub-1', author=author1,
        content='content', status='published', is_deleted=False
    )
    p1.categories.add(cat1, cat2)

    p2 = Post.objects.create(
        title='Deleted Post', slug='del-1', author=author1,
        content='content', status='published', is_deleted=True
    )
    p2.categories.add(cat1)

    p3 = Post.objects.create(
        title='Draft Post', slug='draft-1', author=author1,
        content='content', status='draft', is_deleted=False
    )
    p3.categories.add(cat3)

    # author2: only deleted posts
    p4 = Post.objects.create(
        title='Bob Deleted', slug='bob-del', author=author2,
        content='content', status='published', is_deleted=True
    )
    p4.categories.add(cat2)

    # author3: only drafts
    p5 = Post.objects.create(
        title='Charlie Draft', slug='charlie-draft', author=author3,
        content='content', status='draft', is_deleted=False
    )
    p5.categories.add(cat1)

    # Comments
    Comment.objects.create(
        post=p1, author_name='Commenter1', email='c1@test.com',
        content='Good post', is_approved=True
    )
    Comment.objects.create(
        post=p2, author_name='Commenter2', email='c2@test.com',
        content='On deleted post', is_approved=True
    )
    Comment.objects.create(
        post=p3, author_name='Commenter3', email='c3@test.com',
        content='On draft post', is_approved=True
    )

    return {
        'authors': (author1, author2, author3),
        'categories': (cat1, cat2, cat3),
        'posts': (p1, p2, p3, p4, p5),
    }


# ============================================================
# FAIL_TO_PASS Tests — these expose the 6 bugs
# ============================================================

class TestTopAuthorsFiltering:
    """Requirement 1 & 2: Top Authors must only show authors with published, non-deleted posts."""

    def test_top_authors_excludes_author_with_only_deleted_posts(self, setup_data):
        stats = get_dashboard_stats()
        author_usernames = [a['username'] for a in stats['top_authors']]
        assert 'bob' not in author_usernames

    def test_top_authors_excludes_author_with_only_draft_posts(self, setup_data):
        stats = get_dashboard_stats()
        author_usernames = [a['username'] for a in stats['top_authors']]
        assert 'charlie' not in author_usernames

    def test_top_authors_post_count_excludes_deleted_posts(self, setup_data):
        stats = get_dashboard_stats()
        alice = next(a for a in stats['top_authors'] if a['username'] == 'alice')
        assert alice['post_count'] == 1

    def test_top_authors_post_count_excludes_draft_posts(self, setup_data):
        stats = get_dashboard_stats()
        alice = next(a for a in stats['top_authors'] if a['username'] == 'alice')
        # alice has 1 published (non-deleted), 1 deleted-published, 1 draft
        # only the 1 published non-deleted should count
        assert alice['post_count'] == 1


class TestRecentCommentsFiltering:
    """Requirement 3 & 4: Recent Comments must exclude comments on deleted/unpublished posts."""

    def test_recent_comments_excludes_comments_on_deleted_posts(self, setup_data):
        stats = get_dashboard_stats()
        comment_names = [c['author_name'] for c in stats['recent_comments']]
        assert 'Commenter2' not in comment_names

    def test_recent_comments_excludes_comments_on_draft_posts(self, setup_data):
        stats = get_dashboard_stats()
        comment_names = [c['author_name'] for c in stats['recent_comments']]
        assert 'Commenter3' not in comment_names

    def test_recent_comments_only_shows_comments_on_published_non_deleted(self, setup_data):
        stats = get_dashboard_stats()
        assert len(stats['recent_comments']) == 1
        assert stats['recent_comments'][0]['author_name'] == 'Commenter1'


class TestCategoryStatsFiltering:
    """Requirement 5 & 6: Category Stats must not duplicate and must count only published non-deleted."""

    def test_category_stats_no_duplicate_entries(self, setup_data):
        stats = get_dashboard_stats()
        cat_names = [c['name'] for c in stats['category_stats']]
        assert len(cat_names) == len(set(cat_names))

    def test_category_stats_counts_only_published_non_deleted(self, setup_data):
        stats = get_dashboard_stats()
        cat_map = {c['name']: c['post_count'] for c in stats['category_stats']}
        # p1 (published, not deleted) is in Python and Django
        # p2 (published, deleted) is in Python — should NOT count
        # p3 (draft) is in Testing — should NOT count
        # p4 (published, deleted) is in Django — should NOT count
        # p5 (draft) is in Python — should NOT count
        assert cat_map['Python'] == 1
        assert cat_map['Django'] == 1
        assert cat_map['Testing'] == 0


class TestDateRangeFilter:
    """Requirement 7: Date range must be inclusive on both ends."""

    def test_date_range_includes_boundary_dates(self, setup_data):
        posts = setup_data['posts']
        p1 = posts[0]
        # Use the exact created_at of the post as both start and end
        start = p1.created_at
        end = p1.created_at
        stats = get_dashboard_stats(start_date=start, end_date=end)
        titles = [p['title'] for p in stats['filtered_posts']]
        assert 'Published Post' in titles


class TestSoftDeleteFilter:
    """Requirement 8: All post queries must exclude soft-deleted posts."""

    def test_filtered_posts_excludes_deleted(self, setup_data):
        stats = get_dashboard_stats()
        titles = [p['title'] for p in stats['filtered_posts']]
        assert 'Deleted Post' not in titles
        assert 'Bob Deleted' not in titles

    def test_filtered_posts_total_count_excludes_deleted(self, setup_data):
        stats = get_dashboard_stats()
        # 3 non-deleted posts: Published Post, Draft Post, Charlie Draft
        assert stats['total_count'] == 3


class TestDraftFilterLogic:
    """Requirement: Draft filter must return only draft posts, not published."""

    def test_draft_filter_excludes_published_posts(self, setup_data):
        stats = get_dashboard_stats(status_filter='draft')
        statuses = [p['status'] for p in stats['filtered_posts']]
        assert 'published' not in statuses

    def test_draft_filter_returns_only_drafts(self, setup_data):
        stats = get_dashboard_stats(status_filter='draft')
        for post in stats['filtered_posts']:
            assert post['status'] == 'draft'


class TestAuthorStatsFiltering:
    """Requirement 8: get_author_stats must also exclude deleted posts."""

    def test_author_stats_total_excludes_deleted(self, setup_data):
        author1 = setup_data['authors'][0]
        result = get_author_stats(author1.id)
        # alice has 3 posts total, but 1 is deleted → 2 non-deleted
        assert result['total_posts'] == 2

    def test_author_stats_published_excludes_deleted(self, setup_data):
        author1 = setup_data['authors'][0]
        result = get_author_stats(author1.id)
        # alice has 2 published posts, but 1 is deleted → 1
        assert result['published_posts'] == 1

    def test_author_stats_comments_excludes_deleted_post_comments(self, setup_data):
        author1 = setup_data['authors'][0]
        result = get_author_stats(author1.id)
        # alice has comments on p1 (1), p2 (deleted, 1), p3 (1)
        # excluding deleted post comments: 2
        assert result['total_comments'] == 2


# ============================================================
# PASS_TO_PASS Tests — these pass on both before and after
# ============================================================

class TestResponseStructure:
    """Requirement 9: API response structure must remain unchanged."""

    def test_dashboard_stats_has_required_keys(self, setup_data):
        stats = get_dashboard_stats()
        assert 'top_authors' in stats
        assert 'recent_comments' in stats
        assert 'category_stats' in stats
        assert 'filtered_posts' in stats
        assert 'total_count' in stats

    def test_top_authors_entry_has_correct_fields(self, setup_data):
        stats = get_dashboard_stats()
        if stats['top_authors']:
            entry = stats['top_authors'][0]
            assert 'id' in entry
            assert 'username' in entry
            assert 'post_count' in entry

    def test_recent_comments_entry_has_correct_fields(self, setup_data):
        stats = get_dashboard_stats()
        if stats['recent_comments']:
            entry = stats['recent_comments'][0]
            assert 'id' in entry
            assert 'author_name' in entry
            assert 'post_title' in entry
            assert 'created_at' in entry

    def test_category_stats_entry_has_correct_fields(self, setup_data):
        stats = get_dashboard_stats()
        if stats['category_stats']:
            entry = stats['category_stats'][0]
            assert 'id' in entry
            assert 'name' in entry
            assert 'post_count' in entry

    def test_filtered_posts_entry_has_correct_fields(self, setup_data):
        stats = get_dashboard_stats()
        if stats['filtered_posts']:
            entry = stats['filtered_posts'][0]
            assert 'id' in entry
            assert 'title' in entry
            assert 'author' in entry
            assert 'status' in entry
            assert 'categories' in entry

    def test_total_count_is_integer(self, setup_data):
        stats = get_dashboard_stats()
        assert isinstance(stats['total_count'], int)


class TestGetAuthorStatsBasic:
    """Basic get_author_stats tests that pass on both versions."""

    def test_returns_none_for_nonexistent_author(self, db):
        result = get_author_stats(99999)
        assert result is None

    def test_author_stats_has_correct_keys(self, setup_data):
        author1 = setup_data['authors'][0]
        result = get_author_stats(author1.id)
        assert 'author_id' in result
        assert 'username' in result
        assert 'total_posts' in result
        assert 'published_posts' in result
        assert 'total_comments' in result


class TestPublishedFilter:
    """Status filter for 'published' works on both versions."""

    def test_published_filter_returns_published_posts(self, setup_data):
        stats = get_dashboard_stats(status_filter='published')
        for post in stats['filtered_posts']:
            assert post['status'] == 'published'
