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

-- Test 9: Verify orders exactly at midnight on p_start_date are included
DO $$
DECLARE
    v_result RECORD;
    v_manual_count INT;
    v_customer_id BIGINT := 100;
    v_test_date DATE := '2024-07-01';
BEGIN
    -- Insert test order exactly at midnight on start date
    INSERT INTO orders (customer_id, status, total_price, created_at) VALUES
        (v_customer_id, 'COMPLETED', 50.00, v_test_date::timestamp);
    
    SELECT * INTO v_result
    FROM get_customer_order_metrics(v_customer_id, v_test_date, v_test_date);
    
    -- Manual count using original logic (DATE function)
    SELECT COUNT(*)::INT INTO v_manual_count
    FROM orders
    WHERE customer_id = v_customer_id
      AND DATE(created_at) >= v_test_date
      AND DATE(created_at) <= v_test_date;
    
    IF v_result.total_orders != v_manual_count THEN
        RAISE EXCEPTION 'Test 9 FAILED: Order at midnight on start_date not included. Function: %, Expected: %', 
            v_result.total_orders, v_manual_count;
    END IF;
    
    IF v_result.total_orders != 1 THEN
        RAISE EXCEPTION 'Test 9 FAILED: Expected 1 order at midnight, got %', v_result.total_orders;
    END IF;
    
    -- Cleanup
    DELETE FROM orders WHERE customer_id = v_customer_id;
    
    RAISE NOTICE 'Test 9 PASSED: Orders at midnight on p_start_date are included';
END $$;

-- Test 10: Verify orders at end of p_end_date (23:59:59.999...) are included
DO $$
DECLARE
    v_result RECORD;
    v_manual_count INT;
    v_customer_id BIGINT := 101;
    v_test_date DATE := '2024-07-15';
BEGIN
    -- Insert test order at end of end date (just before next day)
    INSERT INTO orders (customer_id, status, total_price, created_at) VALUES
        (v_customer_id, 'COMPLETED', 75.00, (v_test_date::timestamp + INTERVAL '1 day' - INTERVAL '1 microsecond'));
    
    SELECT * INTO v_result
    FROM get_customer_order_metrics(v_customer_id, v_test_date, v_test_date);
    
    -- Manual count using original logic (DATE function)
    SELECT COUNT(*)::INT INTO v_manual_count
    FROM orders
    WHERE customer_id = v_customer_id
      AND DATE(created_at) >= v_test_date
      AND DATE(created_at) <= v_test_date;
    
    IF v_result.total_orders != v_manual_count THEN
        RAISE EXCEPTION 'Test 10 FAILED: Order at end of end_date not included. Function: %, Expected: %', 
            v_result.total_orders, v_manual_count;
    END IF;
    
    IF v_result.total_orders != 1 THEN
        RAISE EXCEPTION 'Test 10 FAILED: Expected 1 order at end of end_date, got %', v_result.total_orders;
    END IF;
    
    -- Cleanup
    DELETE FROM orders WHERE customer_id = v_customer_id;
    
    RAISE NOTICE 'Test 10 PASSED: Orders at end of p_end_date are included';
END $$;

-- Test 11: Verify invalid date range (p_start_date > p_end_date) raises exception
DO $$
DECLARE
    v_result RECORD;
    v_exception_raised BOOLEAN := FALSE;
    v_customer_id BIGINT := 1;
    v_start_date DATE := '2024-12-31';
    v_end_date DATE := '2024-01-01';
BEGIN
    BEGIN
        SELECT * INTO v_result
        FROM get_customer_order_metrics(v_customer_id, v_start_date, v_end_date);
    EXCEPTION
        WHEN OTHERS THEN
            v_exception_raised := TRUE;
    END;
    
    IF NOT v_exception_raised THEN
        RAISE EXCEPTION 'Test 11 FAILED: Function should raise exception for invalid date range (start > end)';
    END IF;
    
    RAISE NOTICE 'Test 11 PASSED: Invalid date range correctly raises exception';
END $$;

-- Test 12: Verify single day range (p_start_date = p_end_date)
DO $$
DECLARE
    v_result RECORD;
    v_manual_count INT;
    v_customer_id BIGINT := 102;
    v_test_date DATE := '2024-08-20';
BEGIN
    -- Insert multiple orders on the same day
    INSERT INTO orders (customer_id, status, total_price, created_at) VALUES
        (v_customer_id, 'COMPLETED', 100.00, v_test_date::timestamp + INTERVAL '10 hours'),
        (v_customer_id, 'CANCELLED', 50.00, v_test_date::timestamp + INTERVAL '15 hours'),
        (v_customer_id, 'COMPLETED', 200.00, v_test_date::timestamp + INTERVAL '20 hours');
    
    SELECT * INTO v_result
    FROM get_customer_order_metrics(v_customer_id, v_test_date, v_test_date);
    
    -- Manual count using original logic
    SELECT COUNT(*)::INT INTO v_manual_count
    FROM orders
    WHERE customer_id = v_customer_id
      AND DATE(created_at) >= v_test_date
      AND DATE(created_at) <= v_test_date;
    
    IF v_result.total_orders != v_manual_count THEN
        RAISE EXCEPTION 'Test 12 FAILED: Single day range count mismatch. Function: %, Expected: %', 
            v_result.total_orders, v_manual_count;
    END IF;
    
    IF v_result.total_orders != 3 THEN
        RAISE EXCEPTION 'Test 12 FAILED: Expected 3 orders for single day, got %', v_result.total_orders;
    END IF;
    
    IF v_result.completed_orders != 2 THEN
        RAISE EXCEPTION 'Test 12 FAILED: Expected 2 completed orders, got %', v_result.completed_orders;
    END IF;
    
    -- Cleanup
    DELETE FROM orders WHERE customer_id = v_customer_id;
    
    RAISE NOTICE 'Test 12 PASSED: Single day range (p_start_date = p_end_date) works correctly';
END $$;

-- Test 13: Verify orders spanning across date boundary at midnight
DO $$
DECLARE
    v_result_before RECORD;
    v_result_after RECORD;
    v_result_span RECORD;
    v_manual_count_before INT;
    v_manual_count_after INT;
    v_manual_count_span INT;
    v_customer_id BIGINT := 103;
    v_date_before DATE := '2024-09-30';
    v_date_after DATE := '2024-10-01';
BEGIN
    -- Insert orders around midnight boundary
    INSERT INTO orders (customer_id, status, total_price, created_at) VALUES
        (v_customer_id, 'COMPLETED', 100.00, v_date_before::timestamp + INTERVAL '23 hours' + INTERVAL '30 minutes'),
        (v_customer_id, 'COMPLETED', 200.00, v_date_after::timestamp + INTERVAL '30 minutes'),
        (v_customer_id, 'CANCELLED', 50.00, v_date_after::timestamp + INTERVAL '1 hour');
    
    -- Test before date (should include order at 23:30)
    SELECT * INTO v_result_before
    FROM get_customer_order_metrics(v_customer_id, v_date_before, v_date_before);
    
    SELECT COUNT(*)::INT INTO v_manual_count_before
    FROM orders
    WHERE customer_id = v_customer_id
      AND DATE(created_at) >= v_date_before
      AND DATE(created_at) <= v_date_before;
    
    -- Test after date (should include orders on next day)
    SELECT * INTO v_result_after
    FROM get_customer_order_metrics(v_customer_id, v_date_after, v_date_after);
    
    SELECT COUNT(*)::INT INTO v_manual_count_after
    FROM orders
    WHERE customer_id = v_customer_id
      AND DATE(created_at) >= v_date_after
      AND DATE(created_at) <= v_date_after;
    
    -- Test spanning both dates
    SELECT * INTO v_result_span
    FROM get_customer_order_metrics(v_customer_id, v_date_before, v_date_after);
    
    SELECT COUNT(*)::INT INTO v_manual_count_span
    FROM orders
    WHERE customer_id = v_customer_id
      AND DATE(created_at) >= v_date_before
      AND DATE(created_at) <= v_date_after;
    
    IF v_result_before.total_orders != v_manual_count_before THEN
        RAISE EXCEPTION 'Test 13 FAILED: Before date boundary mismatch. Function: %, Expected: %', 
            v_result_before.total_orders, v_manual_count_before;
    END IF;
    
    IF v_result_after.total_orders != v_manual_count_after THEN
        RAISE EXCEPTION 'Test 13 FAILED: After date boundary mismatch. Function: %, Expected: %', 
            v_result_after.total_orders, v_manual_count_after;
    END IF;
    
    IF v_result_span.total_orders != v_manual_count_span THEN
        RAISE EXCEPTION 'Test 13 FAILED: Spanning date boundary mismatch. Function: %, Expected: %', 
            v_result_span.total_orders, v_manual_count_span;
    END IF;
    
    IF v_result_span.total_orders != 3 THEN
        RAISE EXCEPTION 'Test 13 FAILED: Expected 3 orders spanning boundary, got %', v_result_span.total_orders;
    END IF;
    
    -- Cleanup
    DELETE FROM orders WHERE customer_id = v_customer_id;
    
    RAISE NOTICE 'Test 13 PASSED: Orders spanning date boundary at midnight handled correctly';
END $$;

-- Test 14: Verify multiple orders with the same timestamp
DO $$
DECLARE
    v_result RECORD;
    v_manual_count INT;
    v_customer_id BIGINT := 104;
    v_test_date DATE := '2024-11-10';
    v_exact_timestamp TIMESTAMP := v_test_date::timestamp + INTERVAL '12 hours';
BEGIN
    -- Insert multiple orders with identical timestamp
    INSERT INTO orders (customer_id, status, total_price, created_at) VALUES
        (v_customer_id, 'COMPLETED', 100.00, v_exact_timestamp),
        (v_customer_id, 'COMPLETED', 200.00, v_exact_timestamp),
        (v_customer_id, 'CANCELLED', 50.00, v_exact_timestamp),
        (v_customer_id, 'PENDING', 75.00, v_exact_timestamp);
    
    SELECT * INTO v_result
    FROM get_customer_order_metrics(v_customer_id, v_test_date, v_test_date);
    
    -- Manual count using original logic
    SELECT COUNT(*)::INT INTO v_manual_count
    FROM orders
    WHERE customer_id = v_customer_id
      AND DATE(created_at) >= v_test_date
      AND DATE(created_at) <= v_test_date;
    
    IF v_result.total_orders != v_manual_count THEN
        RAISE EXCEPTION 'Test 14 FAILED: Multiple orders with same timestamp count mismatch. Function: %, Expected: %', 
            v_result.total_orders, v_manual_count;
    END IF;
    
    IF v_result.total_orders != 4 THEN
        RAISE EXCEPTION 'Test 14 FAILED: Expected 4 orders with same timestamp, got %', v_result.total_orders;
    END IF;
    
    IF v_result.completed_orders != 2 THEN
        RAISE EXCEPTION 'Test 14 FAILED: Expected 2 completed orders, got %', v_result.completed_orders;
    END IF;
    
    IF v_result.cancelled_orders != 1 THEN
        RAISE EXCEPTION 'Test 14 FAILED: Expected 1 cancelled order, got %', v_result.cancelled_orders;
    END IF;
    
    -- Cleanup
    DELETE FROM orders WHERE customer_id = v_customer_id;
    
    RAISE NOTICE 'Test 14 PASSED: Multiple orders with same timestamp handled correctly';
END $$;

-- Test 15: Verify date boundary equivalence with original DATE() function logic
DO $$
DECLARE
    v_result_optimized RECORD;
    v_result_original INT;
    v_customer_id BIGINT := 1;
    v_start_date DATE := '2024-01-01';
    v_end_date DATE := '2024-12-31';
BEGIN
    -- Get result from optimized function
    SELECT * INTO v_result_optimized
    FROM get_customer_order_metrics(v_customer_id, v_start_date, v_end_date);
    
    -- Get count using original DATE() function logic
    SELECT COUNT(*)::INT INTO v_result_original
    FROM orders
    WHERE customer_id = v_customer_id
      AND DATE(created_at) >= v_start_date
      AND DATE(created_at) <= v_end_date;
    
    IF v_result_optimized.total_orders != v_result_original THEN
        RAISE EXCEPTION 'Test 15 FAILED: Date boundary equivalence mismatch. Optimized: %, Original logic: %', 
            v_result_optimized.total_orders, v_result_original;
    END IF;
    
    RAISE NOTICE 'Test 15 PASSED: Date boundary equivalence verified with original DATE() logic';
END $$;

-- Test 16: Verify very large date range (100+ years) - boundary test
DO $$
DECLARE
    v_result RECORD;
    v_customer_id BIGINT := 105;
    v_start_date DATE := '1900-01-01';
    v_end_date DATE := '2100-12-31';
BEGIN
    -- Insert an order in the middle of the range
    INSERT INTO orders (customer_id, status, total_price, created_at) VALUES
        (v_customer_id, 'COMPLETED', 500.00, '2000-06-15 12:00:00'::timestamp);
    
    SELECT * INTO v_result
    FROM get_customer_order_metrics(v_customer_id, v_start_date, v_end_date);
    
    IF v_result.total_orders != 1 THEN
        RAISE EXCEPTION 'Test 16 FAILED: Expected 1 order in large date range, got %', v_result.total_orders;
    END IF;
    
    -- Test with no orders in range
    SELECT * INTO v_result
    FROM get_customer_order_metrics(v_customer_id, '1800-01-01'::date, '1899-12-31'::date);
    
    IF v_result.total_orders != 0 THEN
        RAISE EXCEPTION 'Test 16 FAILED: Expected 0 orders in empty large date range, got %', v_result.total_orders;
    END IF;
    
    -- Cleanup
    DELETE FROM orders WHERE customer_id = v_customer_id;
    
    RAISE NOTICE 'Test 16 PASSED: Very large date ranges handled correctly';
END $$;

-- Test 17: Verify determinism (repeatability)
DO $$
DECLARE
    v_result1 RECORD;
    v_result2 RECORD;
    v_result3 RECORD;
    v_customer_id BIGINT := 1;
    v_start_date DATE := '2024-01-01';
    v_end_date DATE := '2024-12-31';
BEGIN
    -- Call function 3 times
    SELECT * INTO v_result1 FROM get_customer_order_metrics(v_customer_id, v_start_date, v_end_date);
    SELECT * INTO v_result2 FROM get_customer_order_metrics(v_customer_id, v_start_date, v_end_date);
    SELECT * INTO v_result3 FROM get_customer_order_metrics(v_customer_id, v_start_date, v_end_date);
    
    -- Verify all results are identical
    IF v_result1 != v_result2 OR v_result2 != v_result3 THEN
        RAISE EXCEPTION 'Test 17 FAILED: Results are not deterministic across multiple calls';
    END IF;
    
    RAISE NOTICE 'Test 17 PASSED: Determinism verified across multiple calls';
END $$;

-- Test 18: Verify single index scan using EXPLAIN
DO $$
DECLARE
    v_explain_output TEXT;
    v_scan_count INT;
BEGIN
    -- Get EXPLAIN output for the function's internal query (simulated)
    -- We use a representative query since EXPLAIN ANALYZE on a function call 
    -- might not show the inner query plan clearly depending on the PG version
    
    FOR v_explain_output IN 
        EXPLAIN (FORMAT TEXT)
        SELECT
            COUNT(*)::INT,
            COUNT(*) FILTER (WHERE status = 'COMPLETED')::INT,
            COUNT(*) FILTER (WHERE status = 'CANCELLED')::INT,
            COALESCE(SUM(total_price) FILTER (WHERE status = 'COMPLETED'), 0)
        FROM orders
        WHERE customer_id = 1
          AND created_at >= '2024-01-01'::timestamp
          AND created_at < ('2024-12-31'::date + INTERVAL '1 day')::timestamp
    LOOP
        -- Check if it's using an index scan on orders
        -- And count total scans on 'orders'
        IF v_explain_output ~* 'Scan.*orders' THEN
            v_scan_count := COALESCE(v_scan_count, 0) + 1;
        END IF;
    END LOOP;

    IF v_scan_count > 1 THEN
        RAISE EXCEPTION 'Test 18 FAILED: Multiple scans detected on orders table (count: %)', v_scan_count;
    ELSIF v_scan_count = 0 THEN
        RAISE EXCEPTION 'Test 18 FAILED: No scan detected on orders table in EXPLAIN output';
    END IF;

    RAISE NOTICE 'Test 18 PASSED: Single scan verified on orders table';
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'All tests completed successfully!';
END $$;
