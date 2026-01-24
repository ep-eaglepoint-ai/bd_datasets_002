CREATE OR REPLACE FUNCTION get_avg_order_amount(p_customer_id INT)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer ID cannot be NULL'
            USING ERRCODE = '22004';
    END IF;

    IF p_customer_id <= 0 THEN
        RAISE EXCEPTION 'Customer ID must be a positive integer'
            USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM customers c WHERE c.id = p_customer_id
    ) THEN
        RETURN NULL;
    END IF;

    RETURN (
        SELECT AVG(o.total_amount)
        FROM orders o
        WHERE o.customer_id = p_customer_id
    );
END;
$$;