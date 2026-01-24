DROP TYPE IF EXISTS order_result CASCADE;
CREATE TYPE order_result AS (
    success BOOLEAN,
    order_id INTEGER,
    error_code VARCHAR(50),
    message TEXT
);


CREATE OR REPLACE FUNCTION process_customer_order(
    p_customer_id INTEGER,
    p_product_id INTEGER,
    p_order_quantity INTEGER,
    p_order_timestamp TIMESTAMP WITH TIME ZONE,
    p_request_id UUID
)
RETURNS order_result
LANGUAGE plpgsql
AS $$
DECLARE
    v_result order_result;
    v_customer_exists BOOLEAN;
    v_customer_active BOOLEAN;
    v_product_exists BOOLEAN;
    v_product_available BOOLEAN;
    v_current_inventory INTEGER;
    v_unit_price NUMERIC(12, 2);
    v_total_price NUMERIC(12, 2);
    v_new_order_id INTEGER;
    v_duplicate_exists BOOLEAN;
BEGIN
    v_result.success := FALSE;
    v_result.order_id := NULL;
    v_result.error_code := NULL;
    v_result.message := NULL;

    IF p_customer_id IS NULL THEN
        v_result.error_code := 'SQLITE_MISMATCH';
        v_result.message := 'Invalid input: customer_id cannot be null';
        
        INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
        VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                jsonb_build_object('reason', 'null_customer_id'));
        
        RETURN v_result;
    END IF;

    IF p_product_id IS NULL THEN
        v_result.error_code := 'SQLITE_MISMATCH';
        v_result.message := 'Invalid input: product_id cannot be null';
        
        INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
        VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                jsonb_build_object('reason', 'null_product_id'));
        
        RETURN v_result;
    END IF;

    IF p_order_quantity IS NULL THEN
        v_result.error_code := 'SQLITE_MISMATCH';
        v_result.message := 'Invalid input: order_quantity cannot be null';
        
        INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
        VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                jsonb_build_object('reason', 'null_order_quantity'));
        
        RETURN v_result;
    END IF;

    IF p_order_timestamp IS NULL THEN
        v_result.error_code := 'SQLITE_MISMATCH';
        v_result.message := 'Invalid input: order_timestamp cannot be null';
        
        INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
        VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                jsonb_build_object('reason', 'null_order_timestamp'));
        
        RETURN v_result;
    END IF;

    IF p_request_id IS NULL THEN
        v_result.error_code := 'SQLITE_MISMATCH';
        v_result.message := 'Invalid input: request_id cannot be null';
        
        INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
        VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                jsonb_build_object('reason', 'null_request_id'));
        
        RETURN v_result;
    END IF;

    IF p_order_quantity <= 0 THEN
        v_result.error_code := 'SQLITE_MISMATCH';
        v_result.message := 'Invalid input: order_quantity must be greater than zero';
        
        INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
        VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                jsonb_build_object('reason', 'invalid_quantity', 'provided_quantity', p_order_quantity));
        
        RETURN v_result;
    END IF;

    SELECT EXISTS(SELECT 1 FROM orders WHERE request_id = p_request_id) INTO v_duplicate_exists;
    
    IF v_duplicate_exists THEN
        v_result.error_code := 'SQLITE_CONSTRAINT';
        v_result.message := 'Duplicate request: order with this request_id already exists';
        
        INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
        VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                jsonb_build_object('reason', 'duplicate_request_id'));
        
        RETURN v_result;
    END IF;

    SELECT EXISTS(SELECT 1 FROM customers WHERE customer_id = p_customer_id) INTO v_customer_exists;
    
    IF NOT v_customer_exists THEN
        v_result.error_code := 'SQLITE_NOTFOUND';
        v_result.message := 'Customer not found: no customer exists with the provided customer_id';
        
        INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
        VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                jsonb_build_object('reason', 'customer_not_found'));
        
        RETURN v_result;
    END IF;

    SELECT is_active INTO v_customer_active FROM customers WHERE customer_id = p_customer_id;
    
    IF NOT v_customer_active THEN
        v_result.error_code := 'SQLITE_CONSTRAINT';
        v_result.message := 'Customer inactive: the customer account is not active';
        
        INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
        VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                jsonb_build_object('reason', 'customer_inactive'));
        
        RETURN v_result;
    END IF;

    SELECT EXISTS(SELECT 1 FROM products WHERE product_id = p_product_id) INTO v_product_exists;
    
    IF NOT v_product_exists THEN
        v_result.error_code := 'SQLITE_NOTFOUND';
        v_result.message := 'Product not found: no product exists with the provided product_id';
        
        INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
        VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                jsonb_build_object('reason', 'product_not_found'));
        
        RETURN v_result;
    END IF;

    SELECT is_available, unit_price INTO v_product_available, v_unit_price 
    FROM products WHERE product_id = p_product_id;
    
    IF NOT v_product_available THEN
        v_result.error_code := 'SQLITE_CONSTRAINT';
        v_result.message := 'Product unavailable: the product is not available for sale';
        
        INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
        VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                jsonb_build_object('reason', 'product_unavailable'));
        
        RETURN v_result;
    END IF;

    SELECT quantity INTO v_current_inventory 
    FROM inventory 
    WHERE product_id = p_product_id
    FOR UPDATE;
    
    IF v_current_inventory IS NULL THEN
        v_result.error_code := 'SQLITE_NOTFOUND';
        v_result.message := 'Inventory not found: no inventory record exists for the product';
        
        INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
        VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                jsonb_build_object('reason', 'inventory_not_found'));
        
        RETURN v_result;
    END IF;

    IF v_current_inventory < p_order_quantity THEN
        v_result.error_code := 'SQLITE_BUSY';
        v_result.message := 'Insufficient inventory: not enough stock available for the requested quantity';
        
        INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
        VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                jsonb_build_object('reason', 'insufficient_inventory', 'available', v_current_inventory, 'requested', p_order_quantity));
        
        RETURN v_result;
    END IF;

    v_total_price := v_unit_price * p_order_quantity;

    BEGIN
        INSERT INTO orders (
            customer_id,
            product_id,
            quantity,
            unit_price,
            total_price,
            status,
            request_id,
            order_timestamp
        ) VALUES (
            p_customer_id,
            p_product_id,
            p_order_quantity,
            v_unit_price,
            v_total_price,
            'PENDING',
            p_request_id,
            p_order_timestamp
        ) RETURNING order_id INTO v_new_order_id;

        UPDATE inventory
        SET quantity = quantity - p_order_quantity,
            last_updated = CURRENT_TIMESTAMP
        WHERE product_id = p_product_id;

        INSERT INTO order_audit_log (
            order_id,
            request_id,
            customer_id,
            product_id,
            action,
            status,
            error_code,
            message,
            details
        ) VALUES (
            v_new_order_id,
            p_request_id,
            p_customer_id,
            p_product_id,
            'PROCESS_ORDER',
            'SUCCESS',
            'SQLITE_OK',
            'Order processed successfully',
            jsonb_build_object(
                'order_id', v_new_order_id,
                'quantity', p_order_quantity,
                'unit_price', v_unit_price,
                'total_price', v_total_price,
                'inventory_before', v_current_inventory,
                'inventory_after', v_current_inventory - p_order_quantity
            )
        );

        v_result.success := TRUE;
        v_result.order_id := v_new_order_id;
        v_result.error_code := 'SQLITE_OK';
        v_result.message := 'Order processed successfully';

        RETURN v_result;

    EXCEPTION
        WHEN unique_violation THEN
            v_result.error_code := 'SQLITE_CONSTRAINT';
            v_result.message := 'Constraint violation: duplicate entry detected';
            
            INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
            VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                    jsonb_build_object('reason', 'unique_violation', 'sqlstate', SQLSTATE));
            
            RETURN v_result;

        WHEN check_violation THEN
            v_result.error_code := 'SQLITE_CONSTRAINT';
            v_result.message := 'Constraint violation: check constraint failed';
            
            INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
            VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                    jsonb_build_object('reason', 'check_violation', 'sqlstate', SQLSTATE));
            
            RETURN v_result;

        WHEN foreign_key_violation THEN
            v_result.error_code := 'SQLITE_CONSTRAINT';
            v_result.message := 'Constraint violation: foreign key constraint failed';
            
            INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
            VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                    jsonb_build_object('reason', 'foreign_key_violation', 'sqlstate', SQLSTATE));
            
            RETURN v_result;

        WHEN OTHERS THEN
            v_result.error_code := 'SQLITE_ERROR';
            v_result.message := 'Unexpected error: ' || SQLERRM;
            
            INSERT INTO order_audit_log (request_id, customer_id, product_id, action, status, error_code, message, details)
            VALUES (p_request_id, p_customer_id, p_product_id, 'PROCESS_ORDER', 'FAILED', v_result.error_code, v_result.message,
                    jsonb_build_object('reason', 'unexpected_error', 'sqlstate', SQLSTATE, 'sqlerrm', SQLERRM));
            
            RETURN v_result;
    END;

END;
$$;
