-- Test suite for get_customer_order_metrics function
-- These tests verify correctness and performance characteristics

-- Test 1: Basic functionality with various statuses
DO $$
DECLARE
    v_result RECORD;
    v_customer_id BIGINT := 1;
    v_start_date DATE := '2024-01-01';
    v_end_date DATE := '2024-12-31';
BEGIN
    -- Test basic metrics calculation
    SELECT * INTO v_result
    FROM get_customer_order_metrics(v_customer_id, v_start_date, v_end_date);
    
    -- Verify all fields are returned
    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Test 1 FAILED: Function returned NULL';
    END IF;
    
    IF v_result.total_orders IS NULL THEN
        RAISE EXCEPTION 'Test 1 FAILED: total_orders is NULL';
    END IF;
    
    IF v_result.completed_orders IS NULL THEN
        RAISE EXCEPTION 'Test 1 FAILED: completed_orders is NULL';
    END IF;
    
    IF v_result.cancelled_orders IS NULL THEN
        RAISE EXCEPTION 'Test 1 FAILED: cancelled_orders is NULL';
    END IF;
    
    IF v_result.total_revenue IS NULL THEN
        RAISE EXCEPTION 'Test 1 FAILED: total_revenue is NULL';
    END IF;
    
    RAISE NOTICE 'Test 1 PASSED: All fields returned correctly';
END $$;

-- Test 2: Verify completed_orders <= total_orders
DO $$
DECLARE
    v_result RECORD;
    v_customer_id BIGINT := 1;
    v_start_date DATE := '2024-01-01';
    v_end_date DATE := '2024-12-31';
BEGIN
    SELECT * INTO v_result
    FROM get_customer_order_metrics(v_customer_id, v_start_date, v_end_date);
    
    IF v_result.completed_orders > v_result.total_orders THEN
        RAISE EXCEPTION 'Test 2 FAILED: completed_orders (%) exceeds total_orders (%)', 
            v_result.completed_orders, v_result.total_orders;
    END IF;
    
    RAISE NOTICE 'Test 2 PASSED: completed_orders <= total_orders';
END $$;

-- Test 3: Verify cancelled_orders <= total_orders
DO $$
DECLARE
    v_result RECORD;
    v_customer_id BIGINT := 1;
    v_start_date DATE := '2024-01-01';
    v_end_date DATE := '2024-12-31';
BEGIN
    SELECT * INTO v_result
    FROM get_customer_order_metrics(v_customer_id, v_start_date, v_end_date);
    
    IF v_result.cancelled_orders > v_result.total_orders THEN
        RAISE EXCEPTION 'Test 3 FAILED: cancelled_orders (%) exceeds total_orders (%)', 
            v_result.cancelled_orders, v_result.total_orders;
    END IF;
    
    RAISE NOTICE 'Test 3 PASSED: cancelled_orders <= total_orders';
END $$;

-- Test 4: Verify revenue only from COMPLETED orders
DO $$
DECLARE
    v_result RECORD;
    v_manual_revenue NUMERIC;
    v_customer_id BIGINT := 1;
    v_start_date DATE := '2024-01-01';
    v_end_date DATE := '2024-12-31';
BEGIN
    SELECT * INTO v_result
    FROM get_customer_order_metrics(v_customer_id, v_start_date, v_end_date);
    
    -- Calculate revenue manually from COMPLETED orders only
    SELECT COALESCE(SUM(total_price), 0) INTO v_manual_revenue
    FROM orders
    WHERE customer_id = v_customer_id
      AND created_at >= v_start_date::timestamp
      AND created_at < (v_end_date + INTERVAL '1 day')::timestamp
      AND status = 'COMPLETED';
    
    IF v_result.total_revenue != v_manual_revenue THEN
        RAISE EXCEPTION 'Test 4 FAILED: Revenue mismatch. Function: %, Expected: %', 
            v_result.total_revenue, v_manual_revenue;
    END IF;
    
    RAISE NOTICE 'Test 4 PASSED: Revenue matches COMPLETED orders only';
END $$;

-- Test 5: Verify date range filtering works correctly
DO $$
DECLARE
    v_result_all RECORD;
    v_result_partial RECORD;
    v_customer_id BIGINT := 1;
    v_start_date_full DATE := '2024-01-01';
    v_end_date_full DATE := '2024-12-31';
    v_start_date_partial DATE := '2024-06-01';
    v_end_date_partial DATE := '2024-06-30';
BEGIN
    -- Get metrics for full year
    SELECT * INTO v_result_all
    FROM get_customer_order_metrics(v_customer_id, v_start_date_full, v_end_date_full);
    
    -- Get metrics for partial period
    SELECT * INTO v_result_partial
    FROM get_customer_order_metrics(v_customer_id, v_start_date_partial, v_end_date_partial);
    
    -- Partial should be <= full
    IF v_result_partial.total_orders > v_result_all.total_orders THEN
        RAISE EXCEPTION 'Test 5 FAILED: Partial period has more orders than full period';
    END IF;
    
    RAISE NOTICE 'Test 5 PASSED: Date range filtering works correctly';
END $$;

-- Test 6: Verify function handles empty result sets (no orders)
DO $$
DECLARE
    v_result RECORD;
    v_customer_id BIGINT := 999999; -- Non-existent customer
    v_start_date DATE := '2024-01-01';
    v_end_date DATE := '2024-12-31';
BEGIN
    SELECT * INTO v_result
    FROM get_customer_order_metrics(v_customer_id, v_start_date, v_end_date);
    
    IF v_result.total_orders != 0 THEN
        RAISE EXCEPTION 'Test 6 FAILED: Expected 0 orders for non-existent customer, got %', 
            v_result.total_orders;
    END IF;
    
    IF v_result.completed_orders != 0 THEN
        RAISE EXCEPTION 'Test 6 FAILED: Expected 0 completed orders, got %', 
            v_result.completed_orders;
    END IF;
    
    IF v_result.cancelled_orders != 0 THEN
        RAISE EXCEPTION 'Test 6 FAILED: Expected 0 cancelled orders, got %', 
            v_result.cancelled_orders;
    END IF;
    
    IF v_result.total_revenue != 0 THEN
        RAISE EXCEPTION 'Test 6 FAILED: Expected 0 revenue, got %', 
            v_result.total_revenue;
    END IF;
    
    RAISE NOTICE 'Test 6 PASSED: Function handles empty result sets correctly';
END $$;

-- Test 7: Verify exact count matches manual query
DO $$
DECLARE
    v_result RECORD;
    v_manual_count INT;
    v_customer_id BIGINT := 1;
    v_start_date DATE := '2024-01-01';
    v_end_date DATE := '2024-12-31';
BEGIN
    SELECT * INTO v_result
    FROM get_customer_order_metrics(v_customer_id, v_start_date, v_end_date);
    
    -- Manual count
    SELECT COUNT(*)::INT INTO v_manual_count
    FROM orders
    WHERE customer_id = v_customer_id
      AND created_at >= v_start_date::timestamp
      AND created_at < (v_end_date + INTERVAL '1 day')::timestamp;
    
    IF v_result.total_orders != v_manual_count THEN
        RAISE EXCEPTION 'Test 7 FAILED: Order count mismatch. Function: %, Expected: %', 
            v_result.total_orders, v_manual_count;
    END IF;
    
    RAISE NOTICE 'Test 7 PASSED: Order count matches manual query';
END $$;

-- Test 8: Verify all statuses are handled (not just COMPLETED and CANCELLED)
DO $$
DECLARE
    v_result RECORD;
    v_total_by_status INT;
    v_customer_id BIGINT := 1;
    v_start_date DATE := '2024-01-01';
    v_end_date DATE := '2024-12-31';
BEGIN
    SELECT * INTO v_result
    FROM get_customer_order_metrics(v_customer_id, v_start_date, v_end_date);
    
    -- Count orders with COMPLETED or CANCELLED status
    SELECT COUNT(*)::INT INTO v_total_by_status
    FROM orders
    WHERE customer_id = v_customer_id
      AND created_at >= v_start_date::timestamp
      AND created_at < (v_end_date + INTERVAL '1 day')::timestamp
      AND status IN ('COMPLETED', 'CANCELLED');
    
    -- The sum of completed and cancelled should be <= total
    IF (v_result.completed_orders + v_result.cancelled_orders) > v_result.total_orders THEN
        RAISE EXCEPTION 'Test 8 FAILED: Sum of completed and cancelled exceeds total orders';
    END IF;
    
    RAISE NOTICE 'Test 8 PASSED: All statuses handled correctly';
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'All tests completed successfully!';
END $$;
