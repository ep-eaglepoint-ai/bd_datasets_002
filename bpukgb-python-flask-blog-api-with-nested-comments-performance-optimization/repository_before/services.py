from models import Post, Comment
from database import get_session


class CommentService:
    
    def get_comments_for_post(self, post_id, page=1, per_page=20):
        session = get_session()
        
        all_comments = session.query(Comment).all()
        post_comments = [c for c in all_comments if c.post_id == post_id]
        
        start = (page - 1) * per_page
        end = start + per_page
        root_comments = [c for c in post_comments if c.parent_id is None]
        paginated = root_comments[start:end]
        
        return [self._build_comment_tree(c) for c in paginated]
    
    def _build_comment_tree(self, comment):
        tree = {
            'id': comment.id,
            'content': comment.content,
            'author': comment.author,
            'created_at': comment.created_at.isoformat(),
            'children': []
        }
        
        for child in comment.get_children():
            tree['children'].append(self._build_comment_tree(child))
        
        return tree
    
    def build_comment_tree_from_list(self, comments):
        root_comments = []
        
        for comment in comments:
            if comment.parent_id is None:
                root_comments.append(comment)
        
        def attach_children(parent):
            parent.children_list = []
            for comment in comments:
                if comment.parent_id == parent.id:
                    attach_children(comment)
                    parent.children_list.append(comment)
        
        for root in root_comments:
            attach_children(root)
        
        return root_comments
    
    def delete_comment(self, comment_id):
        session = get_session()
        comment = session.query(Comment).get(comment_id)
        
        if not comment:
            return False
        
        self._delete_children_recursive(comment, session)
        session.delete(comment)
        session.commit()
        return True
    
    def _delete_children_recursive(self, comment, session):
        for child in comment.get_children():
            self._delete_children_recursive(child, session)
            session.delete(child)
    
    def get_comment_count(self, post_id):
        session = get_session()
        post = session.query(Post).get(post_id)
        return len(post.comments)


class PostService:
    
    def get_all_posts(self):
        session = get_session()
        return session.query(Post).all()
    
    def get_post(self, post_id):
        session = get_session()
        return session.query(Post).get(post_id)


comment_service = CommentService()
post_service = PostService()
