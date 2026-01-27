"""
Views for the Atomic Versioned Content Engine.

This module provides views for:
- Admin dashboard (document list, history view)
- Public API (read-only access to live content)
"""
import json
from django.http import JsonResponse, Http404
from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction

from .models import Document, ContentVersion


def admin_dashboard(request):
    """Display a list of all documents."""
    documents = Document.objects.all()
    return render(request, 'admin/dashboard.html', {'documents': documents})


def document_history(request, document_id):
    """Display the version history for a specific document."""
    document = get_object_or_404(Document, id=document_id)
    versions = document.get_versions()
    
    return render(request, 'admin/history.html', {
        'document': document,
        'versions': versions
    })


@csrf_exempt
@require_http_methods(["POST"])
def create_document(request):
    """Create a new document with an optional initial version."""
    try:
        data = json.loads(request.body)
        slug = data.get('slug')
        title = data.get('title', '')
        initial_content = data.get('content', {})
        
        if not slug:
            return JsonResponse({'error': 'slug is required'}, status=400)
        
        # Create document
        document = Document.objects.create(slug=slug, title=title)
        
        # Create initial version if content provided
        if initial_content:
            version = document.create_version(initial_content)
        
        return JsonResponse({
            'id': document.id,
            'slug': document.slug,
            'title': document.title,
            'created_at': document.created_at.isoformat()
        }, status=201)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def create_version(request, document_id):
    """Create a new version for a document."""
    try:
        document = get_object_or_404(Document, id=document_id)
        data = json.loads(request.body)
        content = data.get('content', {})
        
        if not content:
            return JsonResponse({'error': 'content is required'}, status=400)
        
        version = document.create_version(content)
        
        return JsonResponse({
            'id': version.id,
            'version_number': version.version_number,
            'created_at': version.created_at.isoformat(),
            'content_hash': version.content_hash
        }, status=201)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
@transaction.atomic
def publish_version(request, document_id, version_id):
    """Atomically publish a specific version."""
    try:
        document = get_object_or_404(Document, id=document_id)
        
        # Verify version belongs to document
        version = get_object_or_404(ContentVersion, id=version_id, document=document)
        
        # Atomic update of live pointer
        document.live_version = version
        document.save(update_fields=['live_version', 'updated_at'])
        
        return JsonResponse({
            'id': version.id,
            'version_number': version.version_number,
            'is_live': True,
            'document_slug': document.slug
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def public_document_content(request, slug):
    """
    Public API endpoint to retrieve the live version of a document.
    
    Returns 404 if no document exists or no version has been published.
    """
    document = Document.objects.get_live_document(slug)
    
    if document is None:
        try:
            # Check if document exists but has no live version
            doc = Document.objects.get(slug=slug)
            return JsonResponse({
                'error': 'No published version available',
                'document_id': doc.id
            }, status=404)
        except Document.DoesNotExist:
            raise Http404(f"Document with slug '{slug}' not found")
    
    live_version = document.live_version
    
    return JsonResponse({
        'slug': document.slug,
        'title': document.title,
        'version_number': live_version.version_number,
        'content': live_version.content,
        'published_at': live_version.created_at.isoformat() if live_version else None,
        'content_hash': live_version.content_hash
    })


def public_document_versions(request, slug):
    """
    Public API endpoint to retrieve all versions of a document (read-only).
    """
    document = get_object_or_404(Document, slug=slug)
    versions = document.get_versions()
    
    return JsonResponse({
        'slug': document.slug,
        'title': document.title,
        'live_version_id': document.live_version_id,
        'versions': [
            {
                'id': v.id,
                'version_number': v.version_number,
                'created_at': v.created_at.isoformat(),
                'content_hash': v.content_hash
            }
            for v in versions
        ]
    })


def health_check(request):
    """Simple health check endpoint."""
    return JsonResponse({'status': 'healthy'})
