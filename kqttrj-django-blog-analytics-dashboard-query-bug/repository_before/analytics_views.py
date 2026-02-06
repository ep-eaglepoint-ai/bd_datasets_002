from django.db.models import Count, Q
from django.utils import timezone
from datetime import datetime
from .models import Author, Post, Comment, Category


def get_dashboard_stats(start_date=None, end_date=None, status_filter=None):
    stats = {}
    
    top_authors = Author.objects.annotate(
        post_count=Count('posts')
    ).order_by('-post_count')[:10]
    
    stats['top_authors'] = [
        {
            'id': author.id,
            'username': author.user.username,
            'post_count': author.post_count
        }
        for author in top_authors
    ]
    
    recent_comments = Comment.objects.filter(
        is_approved=True
    ).select_related('post').order_by('-created_at')[:20]
    
    stats['recent_comments'] = [
        {
            'id': comment.id,
            'author_name': comment.author_name,
            'post_title': comment.post.title,
            'created_at': comment.created_at.isoformat()
        }
        for comment in recent_comments
    ]
    
    category_stats = Category.objects.annotate(
        post_count=Count('posts')
    )
    
    stats['category_stats'] = [
        {
            'id': cat.id,
            'name': cat.name,
            'post_count': cat.post_count
        }
        for cat in category_stats
    ]
    
    posts_query = Post.objects.all()
    
    if start_date and end_date:
        posts_query = posts_query.filter(
            created_at__gt=start_date,
            created_at__lt=end_date
        )
    
    if status_filter:
        if status_filter == 'draft':
            posts_query = posts_query.exclude(status='archived')
        else:
            posts_query = posts_query.filter(status=status_filter)
    
    filtered_posts = posts_query.select_related('author__user').prefetch_related('categories')
    
    stats['filtered_posts'] = [
        {
            'id': post.id,
            'title': post.title,
            'author': post.author.user.username,
            'status': post.status,
            'categories': [cat.name for cat in post.categories.all()]
        }
        for post in filtered_posts[:50]
    ]
    
    stats['total_count'] = filtered_posts.count()
    
    return stats


def get_author_stats(author_id):
    try:
        author = Author.objects.get(id=author_id)
    except Author.DoesNotExist:
        return None
    
    total_posts = author.posts.count()
    published_posts = author.posts.filter(status='published').count()
    
    total_comments = Comment.objects.filter(post__author=author).count()
    
    return {
        'author_id': author.id,
        'username': author.user.username,
        'total_posts': total_posts,
        'published_posts': published_posts,
        'total_comments': total_comments
    }

