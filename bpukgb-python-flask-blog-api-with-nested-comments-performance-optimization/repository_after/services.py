from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional, Tuple

from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.orm import load_only

from database import session_scope
from models import Comment, Post


class CommentService:
    def __init__(self, cache_ttl_seconds: int = 30):
        self._cache: Dict[Tuple[int, int, Optional[str], int], Dict] = {}
        self._cache_ttl = timedelta(seconds=cache_ttl_seconds)

    def _cache_key(self, post_id, per_page, cursor, max_depth):
        return (post_id, per_page, cursor, max_depth)

    def _get_cache(self, key):
        entry = self._cache.get(key)
        if not entry:
            return None
        if entry["expires_at"] <= datetime.utcnow():
            self._cache.pop(key, None)
            return None
        return entry["value"]

    def _set_cache(self, key, value):
        self._cache[key] = {
            "expires_at": datetime.utcnow() + self._cache_ttl,
            "value": value,
        }

    def invalidate_cache(self, post_id: int):
        keys = [key for key in self._cache.keys() if key[0] == post_id]
        for key in keys:
            self._cache.pop(key, None)

    def get_comments_for_post(
        self,
        post_id: int,
        per_page: int = 20,
        cursor: Optional[str] = None,
        max_depth: int = 10,
    ):
        cache_key = self._cache_key(post_id, per_page, cursor, max_depth)
        cached = self._get_cache(cache_key)
        if cached is not None:
            return cached

        with session_scope() as session:
            root_query = (
                session.query(Comment)
                .options(
                    load_only(
                        Comment.id,
                        Comment.content,
                        Comment.author,
                        Comment.created_at,
                        Comment.post_id,
                        Comment.parent_id,
                    )
                )
                .filter(Comment.post_id == post_id, Comment.parent_id.is_(None))
                .order_by(Comment.created_at, Comment.id)
            )

            if cursor:
                cursor_created_at, cursor_id = self._parse_cursor(cursor)
                root_query = root_query.filter(
                    or_(
                        Comment.created_at > cursor_created_at,
                        and_(
                            Comment.created_at == cursor_created_at,
                            Comment.id > cursor_id,
                        ),
                    )
                )

            roots = root_query.limit(per_page + 1).all()
            has_more = len(roots) > per_page
            roots_page = roots[:per_page]

            comments = (
                session.query(Comment)
                .options(
                    load_only(
                        Comment.id,
                        Comment.content,
                        Comment.author,
                        Comment.created_at,
                        Comment.post_id,
                        Comment.parent_id,
                    )
                )
                .filter(Comment.post_id == post_id)
                .order_by(Comment.created_at, Comment.id)
                .all()
            )

            tree = self._build_comment_tree(comments, roots_page, max_depth)
            next_cursor = None
            if has_more and roots_page:
                last = roots_page[-1]
                next_cursor = self._format_cursor(last.created_at, last.id)

        response = {"comments": tree, "next_cursor": next_cursor}
        self._set_cache(cache_key, response)
        return response

    def _format_cursor(self, created_at: datetime, comment_id: int) -> str:
        return f"{created_at.isoformat()}|{comment_id}"

    def _parse_cursor(self, cursor: str) -> Tuple[datetime, int]:
        created_at_str, comment_id_str = cursor.split("|", 1)
        return datetime.fromisoformat(created_at_str), int(comment_id_str)

    def _build_comment_tree(
        self,
        comments: Iterable[Comment],
        roots: List[Comment],
        max_depth: int,
    ) -> List[Dict]:
        children_map: Dict[Optional[int], List[int]] = defaultdict(list)
        nodes: Dict[int, Dict] = {}

        for comment in comments:
            node = {
                "id": comment.id,
                "content": comment.content,
                "author": comment.author,
                "created_at": comment.created_at.isoformat(),
                "children": [],
                "has_more_replies": False,
            }
            nodes[comment.id] = node
            children_map[comment.parent_id].append(comment.id)

        for parent_id, child_ids in children_map.items():
            if parent_id is None:
                continue
            parent_node = nodes.get(parent_id)
            if parent_node is not None:
                parent_node["children"] = [nodes[child_id] for child_id in child_ids]

        roots_nodes = [nodes[root.id] for root in roots if root.id in nodes]
        self._apply_depth_limit(roots_nodes, max_depth)
        return roots_nodes

    def _apply_depth_limit(self, roots: List[Dict], max_depth: int):
        if max_depth < 1:
            for root in roots:
                if root["children"]:
                    root["has_more_replies"] = True
                root["children"] = []
            return

        stack = [(node, 1) for node in roots]
        while stack:
            node, depth = stack.pop()
            if depth >= max_depth:
                if node["children"]:
                    node["has_more_replies"] = True
                node["children"] = []
                continue
            for child in node["children"]:
                stack.append((child, depth + 1))

    def delete_comment(self, comment_id: int) -> bool:
        with session_scope() as session:
            comment = session.get(Comment, comment_id)
            if not comment:
                return False

            cte = select(Comment.id).where(Comment.id == comment_id).cte(
                recursive=True
            )
            cte = cte.union_all(
                select(Comment.id).where(Comment.parent_id == cte.c.id)
            )

            descendant_ids = session.execute(select(cte.c.id)).scalars().all()
            if descendant_ids:
                session.execute(delete(Comment).where(Comment.id.in_(descendant_ids)))

            self.invalidate_cache(comment.post_id)
            return True

    def get_comment_count(self, post_id: int) -> int:
        with session_scope() as session:
            return (
                session.query(func.count(Comment.id))
                .filter(Comment.post_id == post_id)
                .scalar()
                or 0
            )


class PostService:
    def get_all_posts(self):
        with session_scope() as session:
            posts = (
                session.query(Post)
                .options(load_only(Post.id, Post.title, Post.author, Post.created_at))
                .order_by(Post.created_at.desc())
                .all()
            )

            post_ids = [post.id for post in posts]
            if post_ids:
                counts = (
                    session.query(Comment.post_id, func.count(Comment.id))
                    .filter(Comment.post_id.in_(post_ids))
                    .group_by(Comment.post_id)
                    .all()
                )
                counts_map = {post_id: count for post_id, count in counts}
            else:
                counts_map = {}

            for post in posts:
                post.comment_count = counts_map.get(post.id, 0)

            return posts

    def get_post(self, post_id: int):
        with session_scope() as session:
            post = (
                session.query(Post)
                .options(load_only(Post.id, Post.title, Post.content, Post.author))
                .filter(Post.id == post_id)
                .one_or_none()
            )
            if not post:
                return None
            post.comment_count = (
                session.query(func.count(Comment.id))
                .filter(Comment.post_id == post_id)
                .scalar()
                or 0
            )
            return post


comment_service = CommentService()
post_service = PostService()