import importlib
import inspect
import os
import sys
from contextlib import contextmanager
from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker


def _repo_path():
    base = os.path.dirname(os.path.dirname(__file__))
    target = os.environ.get("TARGET_REPO", "repository_after")
    return os.path.join(base, target)


def _load_repo_modules():
    repo_path = _repo_path()
    if repo_path not in sys.path:
        sys.path.insert(0, repo_path)

    for module_name in ["database", "models", "services", "schemas", "app"]:
        if module_name in sys.modules:
            del sys.modules[module_name]

    database = importlib.import_module("database")
    models = importlib.import_module("models")
    services = importlib.import_module("services")
    return database, models, services


def _configure_database(database, tmp_path):
    db_path = tmp_path / "test.db"
    url = f"sqlite:///{db_path}"

    if hasattr(database, "configure_engine"):
        database.configure_engine(url)
        engine = database.engine
    else:
        engine = create_engine(
            url, connect_args={"check_same_thread": False}, future=True
        )
        database.engine = engine
        database.Base.metadata.bind = engine
        Session = sessionmaker(bind=engine)
        database.get_session = lambda: Session()
        database.db_session = database.get_session()

    database.init_db()
    return engine


@contextmanager
def _query_counter(engine):
    counts = {"select": 0, "delete": 0, "statements": []}

    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        lowered = statement.lower()
        if lowered.strip().startswith("select"):
            counts["select"] += 1
        if lowered.strip().startswith("delete"):
            counts["delete"] += 1
        counts["statements"].append(statement)

    event.listen(engine, "before_cursor_execute", before_cursor_execute)
    try:
        yield counts
    finally:
        event.remove(engine, "before_cursor_execute", before_cursor_execute)


def _seed_comments(session, models, depth=3, roots=2):
    Post = models.Post
    Comment = models.Comment

    post = Post(title="t", content="c", author="a")
    session.add(post)
    session.flush()

    created_at = datetime(2024, 1, 1, 0, 0, 0)
    root_comments = []
    for root_idx in range(roots):
        root = Comment(
            content=f"root-{root_idx}",
            author="a",
            post_id=post.id,
            parent_id=None,
            created_at=created_at + timedelta(seconds=root_idx),
        )
        session.add(root)
        session.flush()
        root_comments.append(root)

        parent = root
        for level in range(1, depth):
            child = Comment(
                content=f"child-{root_idx}-{level}",
                author="a",
                post_id=post.id,
                parent_id=parent.id,
                created_at=created_at + timedelta(seconds=root_idx * 100 + level),
            )
            session.add(child)
            session.flush()
            parent = child

    session.commit()
    return post.id, root_comments


def _assert_supports_kwargs(func, required):
    params = inspect.signature(func).parameters
    for name in required:
        assert name in params


@pytest.fixture()
def repo(tmp_path):
    database, models, services = _load_repo_modules()
    engine = _configure_database(database, tmp_path)
    if hasattr(services.comment_service, "_cache"):
        services.comment_service._cache.clear()
    return {"database": database, "models": models, "services": services, "engine": engine}


def test_parent_id_index(repo):
    Comment = repo["models"].Comment
    index_names = {index.name for index in Comment.__table__.indexes}
    assert "ix_comments_parent_id" in index_names


def test_post_comments_lazy_loading(repo):
    Post = repo["models"].Post
    assert Post.comments.property.lazy != "joined"


def test_filtering_happens_in_sql(repo):
    database = repo["database"]
    services = repo["services"]
    models = repo["models"]

    session = database.get_session()
    post_id, _ = _seed_comments(session, models, depth=2, roots=1)

    _assert_supports_kwargs(
        services.comment_service.get_comments_for_post, ["cursor", "max_depth"]
    )

    with _query_counter(repo["engine"]) as counter:
        services.comment_service.get_comments_for_post(
            post_id, per_page=1, cursor=None, max_depth=2
        )

    statements = " ".join(counter["statements"]).lower()
    assert "where" in statements and "post_id" in statements


def test_no_n_plus_one_queries(repo):
    database = repo["database"]
    services = repo["services"]
    models = repo["models"]

    session = database.get_session()
    post_id, _ = _seed_comments(session, models, depth=3, roots=3)

    _assert_supports_kwargs(
        services.comment_service.get_comments_for_post, ["cursor", "max_depth"]
    )

    with _query_counter(repo["engine"]) as counter:
        services.comment_service.get_comments_for_post(
            post_id, per_page=3, cursor=None, max_depth=3
        )

    assert counter["select"] <= 2


def test_max_depth_truncation(repo):
    database = repo["database"]
    services = repo["services"]
    models = repo["models"]

    session = database.get_session()
    post_id, _ = _seed_comments(session, models, depth=12, roots=1)

    _assert_supports_kwargs(
        services.comment_service.get_comments_for_post, ["cursor", "max_depth"]
    )

    payload = services.comment_service.get_comments_for_post(
        post_id, per_page=1, cursor=None, max_depth=5
    )
    assert isinstance(payload, dict)

    def max_depth(nodes, depth=1):
        if not nodes:
            return depth - 1
        return max(max_depth(node["children"], depth + 1) for node in nodes)

    def has_truncation(nodes):
        for node in nodes:
            if node.get("has_more_replies"):
                return True
            if has_truncation(node.get("children", [])):
                return True
        return False

    depth = max_depth(payload["comments"])
    assert depth <= 5
    assert has_truncation(payload["comments"])


def test_keyset_pagination_stability(repo):
    database = repo["database"]
    services = repo["services"]
    models = repo["models"]
    Comment = models.Comment

    session = database.get_session()
    post_id, roots = _seed_comments(session, models, depth=1, roots=3)

    _assert_supports_kwargs(
        services.comment_service.get_comments_for_post, ["cursor", "max_depth"]
    )

    first_page = services.comment_service.get_comments_for_post(
        post_id, per_page=2, cursor=None, max_depth=2
    )
    assert isinstance(first_page, dict)
    next_cursor = first_page["next_cursor"]

    inserted = Comment(
        content="new-root",
        author="a",
        post_id=post_id,
        parent_id=None,
        created_at=roots[0].created_at + timedelta(microseconds=1),
    )
    session.add(inserted)
    session.commit()

    if hasattr(services.comment_service, "invalidate_cache"):
        services.comment_service.invalidate_cache(post_id)

    second_page = services.comment_service.get_comments_for_post(
        post_id, per_page=2, cursor=next_cursor, max_depth=2
    )
    assert isinstance(second_page, dict)

    second_ids = [comment["id"] for comment in second_page["comments"]]
    assert roots[2].id in second_ids
    assert inserted.id not in second_ids


def test_cache_skips_repeated_queries(repo):
    database = repo["database"]
    services = repo["services"]
    models = repo["models"]

    session = database.get_session()
    post_id, _ = _seed_comments(session, models, depth=2, roots=2)

    _assert_supports_kwargs(
        services.comment_service.get_comments_for_post, ["cursor", "max_depth"]
    )

    services.comment_service.get_comments_for_post(
        post_id, per_page=2, cursor=None, max_depth=2
    )

    with _query_counter(repo["engine"]) as counter:
        services.comment_service.get_comments_for_post(
            post_id, per_page=2, cursor=None, max_depth=2
        )

    assert counter["select"] == 0


def test_comment_count_uses_count_query(repo):
    database = repo["database"]
    services = repo["services"]
    models = repo["models"]

    session = database.get_session()
    post_id, _ = _seed_comments(session, models, depth=2, roots=2)

    with _query_counter(repo["engine"]) as counter:
        count = services.comment_service.get_comment_count(post_id)

    assert count == 4
    assert any("count" in statement.lower() for statement in counter["statements"])


def test_bulk_delete_descendants(repo):
    database = repo["database"]
    services = repo["services"]
    models = repo["models"]

    session = database.get_session()
    post_id, roots = _seed_comments(session, models, depth=4, roots=1)

    with _query_counter(repo["engine"]) as counter:
        services.comment_service.delete_comment(roots[0].id)

    assert counter["delete"] <= 2


def test_posts_query_no_comment_join(repo):
    database = repo["database"]
    services = repo["services"]
    models = repo["models"]

    session = database.get_session()
    _seed_comments(session, models, depth=1, roots=1)

    with _query_counter(repo["engine"]) as counter:
        services.post_service.get_all_posts()

    joined = any("join" in statement.lower() and "comments" in statement.lower() for statement in counter["statements"])
    assert not joined


def test_tree_builder_uses_dictionary_lookup(repo):
    services = repo["services"]
    source = inspect.getsource(services.CommentService._build_comment_tree)
    assert "children_map" in source


def test_session_scope_exists(repo):
    database = repo["database"]
    assert hasattr(database, "session_scope")