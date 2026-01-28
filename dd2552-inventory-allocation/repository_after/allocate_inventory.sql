CREATE OR REPLACE FUNCTION allocate_inventory(
    p_order_id BIGINT,
    p_warehouse_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_item_count INT;
    v_insufficient_count INT;
BEGIN
    SELECT COUNT(*)
    INTO v_order_item_count
    FROM order_items
    WHERE order_id = p_order_id;
    
    IF v_order_item_count = 0 THEN
        RETURN TRUE;
    END IF;

    WITH locked_items AS (
        SELECT i.product_id, i.stock_quantity, oi.quantity
        FROM inventory i
        INNER JOIN order_items oi ON i.product_id = oi.product_id
        WHERE oi.order_id = p_order_id
          AND i.warehouse_id = p_warehouse_id
        FOR UPDATE OF i
    ),
    validation AS (
        SELECT COUNT(*) as insufficient
        FROM order_items oi
        WHERE oi.order_id = p_order_id
          AND NOT EXISTS (
            SELECT 1 FROM locked_items li 
            WHERE li.product_id = oi.product_id 
            AND li.stock_quantity >= oi.quantity
          )
    )
    SELECT insufficient INTO v_insufficient_count
    FROM validation;

    IF v_insufficient_count > 0 THEN
        RETURN FALSE;
    END IF;

    UPDATE inventory i
    SET stock_quantity = stock_quantity - oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
      AND i.product_id = oi.product_id
      AND i.warehouse_id = p_warehouse_id;

    RETURN TRUE;
END;
$$;
