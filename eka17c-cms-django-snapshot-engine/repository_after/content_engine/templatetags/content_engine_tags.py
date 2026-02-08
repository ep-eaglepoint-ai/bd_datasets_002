"""
Custom template tags for the Content Engine.
"""
import json
from django import template

register = template.Library()


@register.filter
def pretty_json(value):
    """Format a JSON object as a pretty-printed string."""
    if value is None:
        return ""
    try:
        return json.dumps(value, indent=2, sort_keys=True)
    except (TypeError, ValueError):
        return str(value)
