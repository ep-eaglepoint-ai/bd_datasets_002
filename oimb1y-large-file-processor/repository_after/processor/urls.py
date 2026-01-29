from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FileAssetViewSet

router = DefaultRouter()
router.register(r'files', FileAssetViewSet, basename='file')

urlpatterns = [
    path('', include(router.urls)),
]
