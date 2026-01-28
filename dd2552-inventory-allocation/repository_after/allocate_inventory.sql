CREATE OR REPLACE FUNCTION allocate_inventory(
    p_order_id BIGINT,
    p_warehouse_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_item_count INT;
    v_lockable_count INT;
    v_sufficient_count INT;
    v_updated_count INT;
BEGIN
    PERFORM 1
    FROM inventory i
    INNER JOIN order_items oi ON i.product_id = oi.product_id
    WHERE oi.order_id = p_order_id
      AND i.warehouse_id = p_warehouse_id
    ORDER BY i.product_id
    FOR UPDATE OF i;

    SELECT 
        (SELECT COUNT(*) FROM order_items WHERE order_id = p_order_id),
        COUNT(*),
        COUNT(*) FILTER (WHERE i.stock_quantity >= oi.quantity)
    INTO v_order_item_count, v_lockable_count, v_sufficient_count
    FROM order_items oi
    LEFT JOIN inventory i ON i.product_id = oi.product_id 
                          AND i.warehouse_id = p_warehouse_id
    WHERE oi.order_id = p_order_id;

    IF v_order_item_count = 0 THEN
        RETURN TRUE;
    END IF;

    IF v_lockable_count < v_order_item_count OR v_sufficient_count < v_order_item_count THEN
        RETURN FALSE;
    END IF;

    UPDATE inventory i
    SET stock_quantity = stock_quantity - oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
      AND i.product_id = oi.product_id
      AND i.warehouse_id = p_warehouse_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count < v_order_item_count THEN
        RAISE EXCEPTION 'Partial update detected: expected %, got %', v_order_item_count, v_updated_count;
    END IF;

    RETURN TRUE;
END;
$$;
