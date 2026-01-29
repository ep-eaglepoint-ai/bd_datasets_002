from flask import Flask, jsonify, request
from models import Post, Comment
from schemas import post_schema, posts_schema, comment_schema, comments_schema
from services import comment_service, post_service
from database import get_session, init_db

app = Flask(__name__)


@app.route('/posts', methods=['GET'])
def get_posts():
    posts = post_service.get_all_posts()
    result = posts_schema.dump(posts)
    return jsonify(result)


@app.route('/posts/<int:post_id>', methods=['GET'])
def get_post(post_id):
    post = post_service.get_post(post_id)
    
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    result = post_schema.dump(post)
    return jsonify(result)


@app.route('/posts/<int:post_id>/comments', methods=['GET'])
def get_comments(post_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    comments = comment_service.get_comments_for_post(post_id, page, per_page)
    
    return jsonify({
        'page': page,
        'per_page': per_page,
        'comments': comments
    })


@app.route('/posts/<int:post_id>/comments', methods=['POST'])
def create_comment(post_id):
    session = get_session()
    data = request.get_json()
    
    comment = Comment(
        content=data['content'],
        author=data['author'],
        post_id=post_id,
        parent_id=data.get('parent_id')
    )
    
    session.add(comment)
    session.commit()
    
    return jsonify(comment_schema.dump(comment)), 201


@app.route('/comments/<int:comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    success = comment_service.delete_comment(comment_id)
    
    if not success:
        return jsonify({'error': 'Comment not found'}), 404
    
    return '', 204


@app.route('/posts/<int:post_id>/comment-count', methods=['GET'])
def get_comment_count(post_id):
    count = comment_service.get_comment_count(post_id)
    return jsonify({'count': count})


if __name__ == '__main__':
    init_db()
    app.run(debug=True)
