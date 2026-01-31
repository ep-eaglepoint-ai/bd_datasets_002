INSERT INTO categories (name, parent_category_id) VALUES
('Electronics', NULL),
('Clothing', NULL),
('Home & Garden', NULL),
('Sports', NULL),
('Books', NULL);

INSERT INTO categories (name, parent_category_id)
SELECT 
    'Subcategory ' || g || ' of ' || c.name,
    c.category_id
FROM categories c, generate_series(1, 9) g
WHERE c.parent_category_id IS NULL;

INSERT INTO products (sku, name, category_id, price, cost)
SELECT 
    'SKU-' || g,
    'Product ' || g,
    (g % 50) + 1,
    (random() * 500 + 10)::numeric(10,2),
    (random() * 200 + 5)::numeric(10,2)
FROM generate_series(1, 100000) g;

INSERT INTO customers (email, created_at, first_purchase_date, country, segment)
SELECT 
    'customer' || g || '@example.com',
    NOW() - (floor(random() * 1825)::int || ' days')::interval,
    (NOW() - (floor(random() * 1825)::int || ' days')::interval)::date,
    (ARRAY['US', 'UK', 'DE', 'FR', 'JP', 'AU', 'CA', 'BR', 'IN', 'MX'])[floor(random() * 10 + 1)],
    (ARRAY['retail', 'wholesale', 'vip'])[floor(random() * 3 + 1)]
FROM generate_series(1, 2000000) g;

INSERT INTO orders (customer_id, order_date, status, total_amount, discount_amount, shipping_cost, payment_method)
SELECT 
    floor(random() * 2000000 + 1)::int,
    NOW() - (floor(random() * 1825)::int || ' days')::interval,
    (ARRAY['pending', 'shipped', 'delivered', 'cancelled'])[floor(random() * 4 + 1)],
    (random() * 1000 + 10)::numeric(12,2),
    (random() * 50)::numeric(10,2),
    (random() * 20)::numeric(10,2),
    (ARRAY['credit_card', 'paypal', 'bank_transfer', 'crypto'])[floor(random() * 4 + 1)]
FROM generate_series(1, 50000000) g;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount)
SELECT 
    floor(random() * 50000000 + 1)::int,
    floor(random() * 100000 + 1)::int,
    floor(random() * 5 + 1)::int,
    (random() * 500 + 10)::numeric(10,2),
    (random() * 20)::numeric(10,2)
FROM generate_series(1, 150000000) g;

INSERT INTO inventory (product_id, warehouse_id, quantity, last_restock_date, reorder_point)
SELECT 
    g,
    floor(random() * 5 + 1)::int,
    floor(random() * 1000)::int,
    (NOW() - (floor(random() * 90)::int || ' days')::interval)::date,
    floor(random() * 50 + 5)::int
FROM generate_series(1, 100000) g;

