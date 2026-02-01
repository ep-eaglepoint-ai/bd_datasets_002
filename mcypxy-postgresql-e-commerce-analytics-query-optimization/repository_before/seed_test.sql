INSERT INTO categories (name, parent_category_id) VALUES
('Electronics', NULL),
('Clothing', NULL),
('Home & Garden', NULL),
('Sports', NULL),
('Books', NULL);

INSERT INTO categories (name, parent_category_id)
SELECT 'Subcategory ' || g || ' of ' || c.name, c.category_id
FROM categories c, generate_series(1, 9) g
WHERE c.parent_category_id IS NULL;

INSERT INTO products (sku, name, category_id, price, cost)
SELECT 'SKU-' || g, 'Product ' || g, (g % 50) + 1, 
       (random() * 500 + 10)::numeric(10,2),
       (random() * 200 + 5)::numeric(10,2)
FROM generate_series(1, 1000) g;

INSERT INTO customers (email, created_at, first_purchase_date, country, segment)
SELECT 'customer' || g || '@test.com', 
       NOW() - (random() * 365 || ' days')::interval,
       (NOW() - (random() * 365 || ' days')::interval)::date,
       'US', 'retail'
FROM generate_series(1, 5000) g;

INSERT INTO orders (customer_id, order_date, status, total_amount, discount_amount, shipping_cost, payment_method)
SELECT 
    (random() * 4999 + 1)::int,
    NOW() - (random() * 365 || ' days')::interval,
    CASE WHEN random() < 0.25 THEN 'cancelled' ELSE 'delivered' END,
    (random() * 500 + 10)::numeric(12,2),
    0, 10, 'credit_card'
FROM generate_series(1, 100000) g;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount)
SELECT 
    (random() * 99999 + 1)::int,
    (random() * 999 + 1)::int,
    (random() * 3 + 1)::int,
    (random() * 100 + 10)::numeric(10,2),
    0
FROM generate_series(1, 200000) g;

INSERT INTO inventory (product_id, warehouse_id, quantity, last_restock_date, reorder_point)
SELECT g, 1, (random() * 500)::int, NOW()::date, 10
FROM generate_series(1, 1000) g;
