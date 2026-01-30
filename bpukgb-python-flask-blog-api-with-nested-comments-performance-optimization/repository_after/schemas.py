from marshmallow import Schema, fields


class CommentSchema(Schema):
    id = fields.Int(dump_only=True)
    content = fields.Str(required=True)
    author = fields.Str(required=True)
    created_at = fields.DateTime(dump_only=True)
    parent_id = fields.Int(allow_none=True)
    post_id = fields.Int(required=True)
    children = fields.List(fields.Dict(), dump_only=True)
    has_more_replies = fields.Bool(dump_only=True)

    class Meta:
        ordered = True


class PostSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True)
    content = fields.Str(required=True)
    author = fields.Str(required=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    comments = fields.Method("get_comments")
    comment_count = fields.Method("get_comment_count")

    def get_comments(self, obj):
        return getattr(obj, "comments_tree", [])

    def get_comment_count(self, obj):
        if hasattr(obj, "comment_count"):
            return obj.comment_count
        return 0


class PostListSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str()
    author = fields.Str()
    created_at = fields.DateTime()
    comment_count = fields.Method("get_comment_count")

    def get_comment_count(self, obj):
        if hasattr(obj, "comment_count"):
            return obj.comment_count
        return 0


comment_schema = CommentSchema()
comments_schema = CommentSchema(many=True)
post_schema = PostSchema()
posts_schema = PostListSchema(many=True)