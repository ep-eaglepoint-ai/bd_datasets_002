DROP TYPE IF EXISTS payment_result CASCADE;
CREATE TYPE payment_result AS (
    status TEXT,
    message TEXT
);

CREATE OR REPLACE FUNCTION process_payment(
    p_order_id INTEGER,
    p_amount DECIMAL,
    p_method TEXT,
    p_timestamp TIMESTAMP,
    p_request_id TEXT
) RETURNS payment_result AS $$
DECLARE
    v_order_record orders%ROWTYPE;
    v_payment_id INTEGER;
    v_existing_payment_id INTEGER;
BEGIN
    SELECT id INTO v_existing_payment_id FROM payments WHERE request_id = p_request_id;
    
    IF v_existing_payment_id IS NOT NULL THEN
        RETURN ROW('OK', 'Payment already processed')::payment_result;
    END IF;

    SELECT * INTO v_order_record FROM orders WHERE id = p_order_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN ROW('ORDER_NOT_FOUND', 'Order not found')::payment_result;
    END IF;

    IF v_order_record.status != 'pending' THEN
        RETURN ROW('ORDER_NOT_PENDING', 'Order is not pending')::payment_result;
    END IF;

    IF p_amount <> v_order_record.total_amount THEN
        RETURN ROW('PAYMENT_AMOUNT_MISMATCH', 'Payment amount mismatch')::payment_result;
    END IF;

    BEGIN
        INSERT INTO payments (order_id, amount, method, payment_timestamp, request_id)
        VALUES (p_order_id, p_amount, p_method, p_timestamp, p_request_id)
        RETURNING id INTO v_payment_id;
    EXCEPTION WHEN unique_violation THEN
        RETURN ROW('OK', 'Payment already processed')::payment_result;
    END;

    UPDATE orders SET status = 'paid' WHERE id = p_order_id;

    INSERT INTO payment_audit_log (order_id, payment_id, action, log_timestamp)
    VALUES (p_order_id, v_payment_id, 'PAYMENT_PROCESSED', CURRENT_TIMESTAMP);

    RETURN ROW('OK', 'Payment processed successfully')::payment_result;

EXCEPTION WHEN OTHERS THEN
    RETURN ROW('ERROR', SQLERRM)::payment_result;
END;
$$ LANGUAGE plpgsql;
