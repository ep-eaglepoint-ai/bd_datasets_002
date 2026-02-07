from repository_after.db import DB

db = DB()

def fetch_user_activity_summary(user_id):
    """
    OPTIMIZED IMPLEMENTATION - Addresses all performance requirements:
    - Uses database-level aggregation to eliminate O(N) memory growth
    - Single SQL query reduces network I/O from O(N) to O(1)
    - Eliminates manual de-duplication and type casting overhead
    - Achieves constant memory usage regardless of event count
    """
    
    # Single optimized SQL query handles de-duplication and aggregation at database level
    # This reduces network transfer from O(N) rows to exactly 1 row
    sql = """
        SELECT 
            COUNT(CASE WHEN type = 'click' THEN 1 END) as click,
            COUNT(CASE WHEN type = 'view' THEN 1 END) as view,
            COUNT(CASE WHEN type = 'purchase' THEN 1 END) as purchase,
            SUM(CASE WHEN type = 'purchase' THEN CAST(metadata->>'price' AS NUMERIC) ELSE 0 END) as total_value
        FROM (
            -- Handle de-duplication at the database level to prevent O(N) memory in Python
            SELECT DISTINCT id, type, metadata 
            FROM events 
            WHERE user_id = %s
        ) AS unique_events
    """
    
    # Execute query - result is a single small dictionary, not O(N) rows
    result = db.query(sql, (user_id,))
    
    if not result:
        return {'click': 0, 'view': 0, 'purchase': 0, 'total_value': 0.0}
    
    summary = result[0]
    
    # Direct type conversion without loops - O(1) operation
    return {
        'click': int(summary['click']),
        'view': int(summary['view']),
        'purchase': int(summary['purchase']),
        'total_value': float(summary['total_value'] or 0.0)
    }