"""Serializers for Document and DocumentVersion."""
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Document, DocumentVersion


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user serializer for embedding in other serializers."""
    
    class Meta:
        model = User
        fields = ['id', 'username']


class DocumentVersionSerializer(serializers.ModelSerializer):
    """Serializer for DocumentVersion model."""
    
    created_by = UserMinimalSerializer(read_only=True)

    class Meta:
        model = DocumentVersion
        fields = [
            'id', 
            'version_number', 
            'content_snapshot', 
            'created_by', 
            'created_at', 
            'change_note'
        ]
        read_only_fields = ['id', 'version_number', 'content_snapshot', 'created_by', 'created_at']


class DocumentVersionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for version list (without content)."""
    
    created_by = UserMinimalSerializer(read_only=True)

    class Meta:
        model = DocumentVersion
        fields = [
            'id', 
            'version_number', 
            'created_by', 
            'created_at', 
            'change_note'
        ]


class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for Document model."""
    
    owner = UserMinimalSerializer(read_only=True)
    version_count = serializers.SerializerMethodField()
    current_version = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 
            'owner', 
            'title', 
            'current_content', 
            'created_at', 
            'updated_at',
            'version_count',
            'current_version',
            'optimistic_version'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at', 'version_count', 'current_version']

    def get_version_count(self, obj):
        # Use annotated value if available to avoid extra queries
        return getattr(obj, 'version_count', obj.versions.count())

    def get_current_version(self, obj):
        latest = obj.versions.first()
        return latest.version_number if latest else 0


class DocumentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for document list."""
    
    owner = UserMinimalSerializer(read_only=True)
    version_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 
            'owner', 
            'title', 
            'created_at', 
            'updated_at',
            'version_count'
        ]

    def get_version_count(self, obj):
        # Always use annotated value in list for performance
        return getattr(obj, 'version_count', 0)


class DocumentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating documents."""
    
    change_note = serializers.CharField(
        max_length=500, 
        required=False, 
        default='Initial version',
        write_only=True
    )

    class Meta:
        model = Document
        fields = ['title', 'current_content', 'change_note']

    def create(self, validated_data):
        change_note = validated_data.pop('change_note', 'Initial version')
        user = self.context['request'].user
        
        document = Document.objects.create(
            owner=user,
            **validated_data
        )
        
        # Create initial version
        document.create_version(user, change_note)
        
        return document


class DocumentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating documents."""
    
    change_note = serializers.CharField(
        max_length=500, 
        required=False, 
        default='',
        write_only=True
    )
    optimistic_version = serializers.IntegerField(write_only=True)

    class Meta:
        model = Document
        fields = ['title', 'current_content', 'change_note', 'optimistic_version']

    def update(self, instance, validated_data):
        from django.db import transaction
        from rest_framework.exceptions import ValidationError

        change_note = validated_data.pop('change_note', '')
        client_version = validated_data.pop('optimistic_version')
        user = self.context['request'].user
        
        with transaction.atomic():
            # Lock the instance and check version
            instance = Document.objects.select_for_update().get(pk=instance.pk)
            
            if client_version != instance.optimistic_version:
                raise ValidationError({
                    'optimistic_version': 'This document has been updated by someone else. Please refresh and try again.'
                }, code='conflict')

            # Check if content actually changed
            title_changed = 'title' in validated_data and validated_data['title'] != instance.title
            content_changed = 'current_content' in validated_data and validated_data['current_content'] != instance.current_content
            
            # Update document fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            
            # Increment optimistic version
            instance.optimistic_version += 1
            instance.save()
            
            # Create new version only if content or title changed
            if title_changed or content_changed:
                instance.create_version(user, change_note)
            
        return instance
