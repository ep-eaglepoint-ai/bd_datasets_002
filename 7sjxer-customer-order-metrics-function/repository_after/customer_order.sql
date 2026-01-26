CREATE OR REPLACE FUNCTION get_customer_order_metrics(
    p_customer_id BIGINT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    total_orders INT,
    completed_orders INT,
    cancelled_orders INT,
    total_revenue NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INT AS total_orders,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::INT AS completed_orders,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')::INT AS cancelled_orders,
        COALESCE(SUM(total_price) FILTER (WHERE status = 'COMPLETED'), 0) AS total_revenue
    FROM orders
    WHERE customer_id = p_customer_id
      AND created_at >= p_start_date::timestamp
      AND created_at < (p_end_date + INTERVAL '1 day')::timestamp;
END;
$$;
