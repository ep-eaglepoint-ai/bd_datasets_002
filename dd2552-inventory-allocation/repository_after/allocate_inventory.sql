CREATE OR REPLACE FUNCTION allocate_inventory(
    p_order_id BIGINT,
    p_warehouse_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_insufficient_count INT;
    v_updated_count INT;
BEGIN
    SELECT COUNT(*)
    INTO v_insufficient_count
    FROM order_items oi
    LEFT JOIN inventory i ON i.product_id = oi.product_id AND i.warehouse_id = p_warehouse_id
    WHERE oi.order_id = p_order_id
      AND (i.stock_quantity IS NULL OR i.stock_quantity < oi.quantity);

    IF v_insufficient_count > 0 THEN
        RETURN FALSE;
    END IF;

    UPDATE inventory i
    SET stock_quantity = stock_quantity - oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
      AND i.product_id = oi.product_id
      AND i.warehouse_id = p_warehouse_id
      AND i.stock_quantity >= oi.quantity;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    SELECT COUNT(*)
    INTO v_insufficient_count
    FROM order_items
    WHERE order_id = p_order_id;
    
    IF v_updated_count < v_insufficient_count THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;
