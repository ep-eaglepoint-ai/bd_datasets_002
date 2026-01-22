CREATE OR REPLACE FUNCTION get_avg_order_amount(customer_id INT) 
RETURNS NUMERIC AS $$
DECLARE
    avg_amount NUMERIC;
BEGIN
    PERFORM pg_sleep(2);

    SELECT AVG(total_amount) INTO avg_amount
    FROM orders
    WHERE customer_id = customer_id;

    RETURN avg_amount;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Unexpected error calculating average order amount: %', SQLERRM
        USING ERRCODE = SQLSTATE;
END;
$$ LANGUAGE plpgsql;
