CREATE OR REPLACE FUNCTION reserve_inventory(
    p_product_id TEXT,   
    p_reservation_quantity INTEGER,
    p_expiration_timestamp TIMESTAMP,
    p_request_identifier VARCHAR(255)
)
RETURNS TABLE (
    reservation_status VARCHAR(50),
    reservation_id UUID,
    remaining_quantity INTEGER,
    error_code VARCHAR(50),
    error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_active BOOLEAN;
    v_available INTEGER;
    v_reservation_id UUID;
BEGIN
    -- Initialize output
    reservation_status := 'FAILED';
    reservation_id := NULL;
    remaining_quantity := 0;
    error_code := 'FAILED';
    error_message := '';

    -- Validate quantity
    IF p_reservation_quantity <= 0 THEN
        error_code := 'INVALID_QUANTITY';
        error_message := 'Reservation quantity must be greater than 0';
        RETURN NEXT; RETURN;
    END IF;

    -- Validate expiration
    IF p_expiration_timestamp <= CURRENT_TIMESTAMP THEN
        error_code := 'INVALID_EXPIRATION';
        error_message := 'Expiration timestamp must be in the future';
        RETURN NEXT; RETURN;
    END IF;

    -- Check duplicate request
    IF EXISTS (
        SELECT 1 FROM inventory_reservations
        WHERE request_identifier = p_request_identifier
    ) THEN
        error_code := 'DUPLICATE_REQUEST';
        error_message := 'Duplicate request identifier';
        RETURN NEXT; RETURN;
    END IF;

    -- Fetch product details with FOR UPDATE
    SELECT active, available_quantity
    INTO v_active, v_available
    FROM products
    WHERE product_id = p_product_id::uuid
    FOR UPDATE;

    IF NOT FOUND THEN
        error_code := 'PRODUCT_NOT_FOUND';
        error_message := 'Product does not exist';
        RETURN NEXT; RETURN;
    END IF;

    -- Check if product is active
    IF NOT v_active THEN
        error_code := 'PRODUCT_INACTIVE';
        error_message := 'Product is not active';
        remaining_quantity := v_available;
        RETURN NEXT; RETURN;
    END IF;

    -- Check available quantity
    IF v_available < p_reservation_quantity THEN
        error_code := 'INSUFFICIENT_STOCK';
        error_message := 'Insufficient inventory available';
        remaining_quantity := v_available;
        RETURN NEXT; RETURN;
    END IF;

    -- Deduct quantity
    UPDATE products
    SET available_quantity = available_quantity - p_reservation_quantity
    WHERE product_id = p_product_id::uuid
    RETURNING available_quantity INTO remaining_quantity;

    -- Insert reservation
    INSERT INTO inventory_reservations (
        product_id,
        reservation_quantity,
        expiration_timestamp,
        request_identifier
    )
    VALUES (
        p_product_id::uuid,
        p_reservation_quantity,
        p_expiration_timestamp,
        p_request_identifier
    )
    RETURNING inventory_reservations.reservation_id
    INTO v_reservation_id;

    -- Insert log
    INSERT INTO reservation_logs (
        reservation_id,
        product_id,
        action
    )
    VALUES (
        v_reservation_id,
        p_product_id::uuid,
        'RESERVATION_CREATED'
    );

    -- Success output
    reservation_status := 'RESERVED';
    reservation_id := v_reservation_id;
    error_code := 'SUCCESS';
    error_message := 'Reservation created successfully';

    RETURN NEXT;
END;
$$;

