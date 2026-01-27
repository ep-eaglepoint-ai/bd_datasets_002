"""
URL configuration for the Content Engine app.
"""
from django.urls import path
from . import views

app_name = 'content_engine'

urlpatterns = [
    # Admin Dashboard (included at /admin/, so final path: /admin/)
    path('', views.admin_dashboard, name='admin_dashboard'),
    path('documents/', views.admin_dashboard, name='document_list'),
    path('documents/<int:document_id>/', views.document_history, name='document_history'),
    
    # Admin API (included at /api/, so final path: /api/documents/)
    path('documents/', views.create_document, name='create_document'),
    path('documents/<int:document_id>/versions/', views.create_version, name='create_version'),
    path('documents/<int:document_id>/versions/<int:version_id>/publish/', 
         views.publish_version, name='publish_version'),
    
    # Public API (included at /api/, so final path: /api/public/<slug>/)
    path('public/<slug:slug>/', views.public_document_content, name='public_content'),
    path('public/<slug:slug>/versions/', views.public_document_versions, name='public_versions'),
    
    # Health check (included at /api/, so final path: /api/health/)
    path('health/', views.health_check, name='health_check'),
]
