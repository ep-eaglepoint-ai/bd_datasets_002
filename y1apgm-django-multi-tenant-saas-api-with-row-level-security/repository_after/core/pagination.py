from rest_framework.pagination import CursorPagination


class CursorPaginationWithOrdering(CursorPagination):
    """
    Cursor-based pagination for efficient handling of large datasets.
    
    Cursor pagination is more efficient than page number pagination because:
    1. It doesn't need to count total records
    2. It maintains consistent ordering even with concurrent inserts/deletes
    3. It's memory efficient for 100,000+ records
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    ordering = '-created_at'  # Default ordering by most recent first

    def get_ordering(self, request, queryset, view):
        """
        Return the ordering to use for cursor pagination.
        Avoid the conflict with OrderingFilter by always using the default ordering.
        """
        # Use our default ordering attribute
        ordering = self.ordering
        if isinstance(ordering, str):
            return (ordering,)
        return tuple(ordering)


class StandardPagination(CursorPaginationWithOrdering):
    """
    Standard pagination class using cursor-based pagination.
    This is the default pagination class used across all endpoints.
    """
    pass
