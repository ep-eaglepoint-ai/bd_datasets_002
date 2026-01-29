"""Custom exception handler for consistent JSON error responses."""
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from django.http import Http404
from django.core.exceptions import PermissionDenied


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns consistent JSON error responses.
    """
    response = exception_handler(exc, context)

    if response is not None:
        custom_response_data = {
            'success': False,
            'error': {
                'code': response.status_code,
                'message': get_error_message(exc),
                'details': response.data if hasattr(response, 'data') else None,
            }
        }
        response.data = custom_response_data

    return response


def get_error_message(exc):
    """Extract a human-readable error message from the exception."""
    if hasattr(exc, 'detail'):
        if isinstance(exc.detail, str):
            return exc.detail
        elif isinstance(exc.detail, dict):
            # Get the first error message
            for key, value in exc.detail.items():
                if isinstance(value, list):
                    return f"{key}: {value[0]}"
                return f"{key}: {value}"
        elif isinstance(exc.detail, list):
            return exc.detail[0] if exc.detail else str(exc)
    return str(exc)
