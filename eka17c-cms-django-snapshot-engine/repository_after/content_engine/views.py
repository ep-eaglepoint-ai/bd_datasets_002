"""
Views for the Atomic Versioned Content Engine.

This module provides views for:
- Admin dashboard (document list, history view)
- Public API (read-only access to live content)
"""
import json
from django.http import JsonResponse, Http404, HttpResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction

from .models import Document, ContentVersion


def admin_dashboard(request):
    """Display a list of all documents."""
    documents = Document.objects.all()
    if request.htmx:
        # HTMX request - return only the document list
        return render(request, 'admin/dashboard_list.html', {'documents': documents})
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
            if request.htmx:
                return HttpResponse('<div class="error">slug is required</div>', status=400)
            return JsonResponse({'error': 'slug is required'}, status=400)
        
        # Create document
        document = Document.objects.create(slug=slug, title=title)
        
        # Create initial version if content provided
        if initial_content:
            version = document.create_version(initial_content)
        
        if request.htmx:
            # Return updated document list
            documents = Document.objects.all()
            return render(request, 'admin/dashboard_list.html', {'documents': documents})
        
        return JsonResponse({
            'id': document.id,
            'slug': document.slug,
            'title': document.title,
            'created_at': document.created_at.isoformat()
        }, status=201)
    except json.JSONDecodeError:
        if request.htmx:
            return HttpResponse('<div class="error">Invalid JSON</div>', status=400)
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        if request.htmx:
            return HttpResponse(f'<div class="error">{str(e)}</div>', status=500)
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
            if request.htmx:
                return HttpResponse('<div class="error">content is required</div>', status=400)
            return JsonResponse({'error': 'content is required'}, status=400)
        
        version = document.create_version(content)
        
        if request.htmx:
            # Return updated version list
            versions = document.get_versions()
            return render(request, 'admin/version_list.html', {
                'document': document,
                'versions': versions
            })
        
        return JsonResponse({
            'id': version.id,
            'version_number': version.version_number,
            'created_at': version.created_at.isoformat(),
            'content_hash': version.content_hash
        }, status=201)
    except json.JSONDecodeError:
        if request.htmx:
            return HttpResponse('<div class="error">Invalid JSON</div>', status=400)
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except ValidationError as e:
        if request.htmx:
            return HttpResponse(f'<div class="error">{str(e)}</div>', status=400)
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        if request.htmx:
            return HttpResponse(f'<div class="error">{str(e)}</div>', status=500)
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
@transaction.atomic
def publish_version(request, document_id, version_id):
    """Atomically publish a specific version."""
    try:
        # Use select_for_update to lock the document row
        document = Document.objects.select_for_update().get(id=document_id)
        
        # Verify version belongs to document
        version = get_object_or_404(ContentVersion, id=version_id, document=document)
        
        # Atomic update of live pointer
        document.live_version = version
        document.save(update_fields=['live_version', 'updated_at'])
        
        if request.htmx:
            # Return updated version list
            versions = document.get_versions()
            return render(request, 'admin/version_list.html', {
                'document': document,
                'versions': versions
            })
        
        return JsonResponse({
            'id': version.id,
            'version_number': version.version_number,
            'is_live': True,
            'document_slug': document.slug
        })
    except Exception as e:
        if request.htmx:
            return HttpResponse(f'<div class="error">{str(e)}</div>', status=500)
        return JsonResponse({'error': str(e)}, status=500)


def compare_versions(request, document_id, version1_id, version2_id):
    """
    Compare two versions of a document.
    
    Returns a comparison view showing differences between versions.
    """
    document = get_object_or_404(Document, id=document_id)
    
    version1 = get_object_or_404(ContentVersion, id=version1_id, document=document)
    version2 = get_object_or_404(ContentVersion, id=version2_id, document=document)
    
    # Get the live version for comparison with draft
    live_version = document.live_version
    
    # Calculate differences
    comparison = version2.compare_with(version1)
    
    return render(request, 'admin/compare.html', {
        'document': document,
        'version1': version1,
        'version2': version2,
        'comparison': comparison,
        'live_version': live_version
    })


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
