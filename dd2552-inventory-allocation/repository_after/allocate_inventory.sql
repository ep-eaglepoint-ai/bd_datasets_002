CREATE OR REPLACE FUNCTION allocate_inventory(
    p_order_id BIGINT,
    p_warehouse_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_item_count INT;
    v_available_count INT;
    v_sufficient_count INT;
    v_updated_count INT;
BEGIN
    SELECT COUNT(DISTINCT oi.product_id)
    INTO v_order_item_count
    FROM order_items oi
    WHERE oi.order_id = p_order_id;

    IF v_order_item_count = 0 THEN
        RETURN TRUE;
    END IF;

    WITH locked_inventory AS (
        SELECT i.product_id, i.warehouse_id, i.stock_quantity
        FROM inventory i
        INNER JOIN order_items oi ON i.product_id = oi.product_id
        WHERE oi.order_id = p_order_id
          AND i.warehouse_id = p_warehouse_id
        ORDER BY i.product_id
        FOR UPDATE OF i
    ),
    order_requirements AS (
        SELECT oi.product_id, SUM(oi.quantity) AS total_qty
        FROM order_items oi
        WHERE oi.order_id = p_order_id
        GROUP BY oi.product_id
    ),
    validation AS (
        SELECT 
            COUNT(DISTINCT orq.product_id) AS required_count,
            COUNT(DISTINCT li.product_id) AS available_count,
            COUNT(DISTINCT li.product_id) FILTER (WHERE li.stock_quantity >= orq.total_qty) AS sufficient_count
        FROM order_requirements orq
        LEFT JOIN locked_inventory li ON li.product_id = orq.product_id
    )
    SELECT v.available_count, v.sufficient_count
    INTO v_available_count, v_sufficient_count
    FROM validation v;

    IF v_available_count < v_order_item_count OR v_sufficient_count < v_order_item_count THEN
        RETURN FALSE;
    END IF;

    WITH order_requirements AS (
        SELECT oi.product_id, SUM(oi.quantity) AS total_qty
        FROM order_items oi
        WHERE oi.order_id = p_order_id
        GROUP BY oi.product_id
    )
    UPDATE inventory i
    SET stock_quantity = i.stock_quantity - orq.total_qty
    FROM order_requirements orq
    WHERE i.product_id = orq.product_id
      AND i.warehouse_id = p_warehouse_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count < v_order_item_count THEN
        RAISE EXCEPTION 'Partial update detected: expected %, got %', v_order_item_count, v_updated_count;
    END IF;

    RETURN TRUE;
END;
$$;
