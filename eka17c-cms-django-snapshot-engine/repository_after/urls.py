"""
Main URL configuration for the Atomic Versioned Content Engine.
"""
from django.urls import path
from django.http import HttpResponse
from content_engine import views


def index(request):
    return HttpResponse("""
    <html>
    <head><title>Atomic Versioned Content Engine</title></head>
    <body>
        <h1>Atomic Versioned Content Engine</h1>
        <ul>
            <li><a href="/admin/">Admin Dashboard</a></li>
            <li><a href="/api/public/sample-document/">Public API Example</a></li>
            <li><a href="/api/health/">Health Check</a></li>
        </ul>
    </body>
    </html>
    """)


urlpatterns = [
    path('', index, name='index'),
    path('admin/', views.admin_dashboard, name='admin_dashboard'),
    path('admin/documents/', views.admin_dashboard, name='document_list'),
    path('admin/documents/<int:document_id>/', views.document_history, name='document_history'),
    path('api/documents/', views.create_document, name='create_document'),
    path('api/documents/<int:document_id>/versions/', views.create_version, name='create_version'),
    path('api/documents/<int:document_id>/versions/<int:version_id>/publish/', 
         views.publish_version, name='publish_version'),
    path('api/public/<slug:slug>/', views.public_document_content, name='public_content'),
    path('api/public/<slug:slug>/versions/', views.public_document_versions, name='public_versions'),
    path('api/health/', views.health_check, name='health_check'),
]
