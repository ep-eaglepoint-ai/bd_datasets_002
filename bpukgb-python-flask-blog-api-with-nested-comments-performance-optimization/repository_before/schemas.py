from marshmallow import Schema, fields


class CommentSchema(Schema):
    id = fields.Int(dump_only=True)
    content = fields.Str(required=True)
    author = fields.Str(required=True)
    created_at = fields.DateTime(dump_only=True)
    parent_id = fields.Int(allow_none=True)
    post_id = fields.Int(required=True)
    children = fields.Nested('self', many=True)
    
    class Meta:
        ordered = True


class PostSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True)
    content = fields.Str(required=True)
    author = fields.Str(required=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    comments = fields.Nested(CommentSchema, many=True)
    comment_count = fields.Method('get_comment_count')
    
    def get_comment_count(self, obj):
        return len(obj.comments)


class PostListSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str()
    author = fields.Str()
    created_at = fields.DateTime()
    comment_count = fields.Method('get_comment_count')
    
    def get_comment_count(self, obj):
        return len(obj.comments)


comment_schema = CommentSchema()
comments_schema = CommentSchema(many=True)
post_schema = PostSchema()
posts_schema = PostListSchema(many=True)
