SELECT 
    DATE(order_date) as day,
    SUM(total_amount) as revenue,
    COUNT(*) as order_count
FROM orders
WHERE order_date >= NOW() - INTERVAL '90 days'
  AND status != 'cancelled'
GROUP BY DATE(order_date)
ORDER BY day;


SELECT 
    c.name as category,
    p.name as product,
    sub.revenue
FROM categories c
CROSS JOIN LATERAL (
    SELECT 
        oi.product_id,
        SUM(oi.quantity * oi.unit_price) as revenue
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    JOIN products p ON p.product_id = oi.product_id
    WHERE p.category_id = c.category_id
      AND o.order_date >= NOW() - INTERVAL '30 days'
      AND o.status != 'cancelled'
    GROUP BY oi.product_id
    ORDER BY revenue DESC
    LIMIT 10
) sub
JOIN products p ON p.product_id = sub.product_id
ORDER BY c.name, sub.revenue DESC;


SELECT 
    TO_CHAR(c.first_purchase_date, 'YYYY-MM') as cohort,
    EXTRACT(MONTH FROM AGE(o.order_date, c.first_purchase_date)) as months_since_first,
    COUNT(DISTINCT c.customer_id) as customers
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
WHERE c.first_purchase_date >= NOW() - INTERVAL '13 months'
  AND o.status != 'cancelled'
  AND o.order_date >= c.first_purchase_date
  AND o.order_date < c.first_purchase_date + INTERVAL '13 months'
GROUP BY 
    TO_CHAR(c.first_purchase_date, 'YYYY-MM'),
    EXTRACT(MONTH FROM AGE(o.order_date, c.first_purchase_date))
ORDER BY cohort, months_since_first;


-- Query 4: Inventory Turnover (optimized with indexed joins)
SELECT 
    p.product_id,
    p.name,
    COALESCE(sales.units_sold, 0) as units_sold,
    i.quantity as current_stock,
    CASE 
        WHEN i.quantity > 0 THEN ROUND(COALESCE(sales.units_sold, 0)::numeric / i.quantity, 2)
        ELSE 0 
    END as turnover_rate
FROM products p
LEFT JOIN inventory i ON i.product_id = p.product_id
LEFT JOIN (
    SELECT 
        oi.product_id,
        SUM(oi.quantity) as units_sold
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    WHERE o.order_date >= NOW() - INTERVAL '90 days'
      AND o.status != 'cancelled'
    GROUP BY oi.product_id
) sales ON sales.product_id = p.product_id
GROUP BY p.product_id, p.name, i.quantity, sales.units_sold
ORDER BY turnover_rate DESC
LIMIT 100;


-- Query 5: Customer Lifetime Value (optimized with filtered aggregation)
SELECT 
    customer_id,
    total_spent,
    order_count,
    NTILE(100) OVER (ORDER BY total_spent) as percentile
FROM (
    SELECT 
        customer_id,
        SUM(total_amount) as total_spent,
        COUNT(*) as order_count
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY customer_id
) customer_totals
ORDER BY percentile DESC, total_spent DESC;


-- Query 6: Category Performance Comparison (optimized with window function)
WITH monthly_revenue AS (
    SELECT 
        p.category_id,
        DATE_TRUNC('month', o.order_date) as month,
        SUM(oi.quantity * oi.unit_price) as revenue
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    JOIN products p ON p.product_id = oi.product_id
    WHERE o.status != 'cancelled'
      AND o.order_date >= NOW() - INTERVAL '13 months'
    GROUP BY p.category_id, DATE_TRUNC('month', o.order_date)
)
SELECT 
    c.name as category,
    curr.month,
    curr.revenue as current_revenue,
    LAG(curr.revenue) OVER (PARTITION BY curr.category_id ORDER BY curr.month) as previous_revenue,
    ROUND(((curr.revenue - LAG(curr.revenue) OVER (PARTITION BY curr.category_id ORDER BY curr.month)) / 
           NULLIF(LAG(curr.revenue) OVER (PARTITION BY curr.category_id ORDER BY curr.month), 0)) * 100, 2) as growth_pct
FROM monthly_revenue curr
JOIN categories c ON c.category_id = curr.category_id
WHERE curr.month >= NOW() - INTERVAL '12 months'
ORDER BY c.name, curr.month;
