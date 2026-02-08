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
DECLARE
    v_total_orders INT := 0;
    v_completed_orders INT := 0;
    v_cancelled_orders INT := 0;
    v_total_revenue NUMERIC := 0;
    r RECORD;
BEGIN
    FOR r IN
        SELECT id, status, total_price
        FROM orders
        WHERE customer_id = p_customer_id
          AND DATE(created_at) >= p_start_date
          AND DATE(created_at) <= p_end_date
    LOOP
        v_total_orders := v_total_orders + 1;

        IF r.status = 'COMPLETED' THEN
            v_completed_orders := v_completed_orders + 1;
            v_total_revenue := v_total_revenue + r.total_price;
        ELSIF r.status = 'CANCELLED' THEN
            v_cancelled_orders := v_cancelled_orders + 1;
        END IF;
    END LOOP;

    IF v_total_orders IS NULL THEN
        v_total_orders := 0;
    END IF;

    RETURN QUERY
    SELECT
        v_total_orders,
        v_completed_orders,
        v_cancelled_orders,
        COALESCE(v_total_revenue, 0);
END;
$$;
