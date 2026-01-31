CREATE OR REPLACE FUNCTION generate_customer_billing_summary(p_customer_id INTEGER)
RETURNS TABLE (
    invoice_id INTEGER,
    billed_amount NUMERIC,
    invoice_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer id is required'
            USING ERRCODE = '22004';
    END IF;

    RETURN QUERY
    SELECT 
        i.id AS invoice_id,
        COALESCE(SUM(il.quantity * p.price), 0) AS billed_amount,
        i.created_at AS invoice_date
    FROM invoices i
    LEFT JOIN invoice_lines il ON il.invoice_id = i.id
    LEFT JOIN products p ON p.id = il.product_id
    WHERE i.customer_id = p_customer_id
    GROUP BY i.id, i.created_at
    ORDER BY i.created_at;
END;
$$;
