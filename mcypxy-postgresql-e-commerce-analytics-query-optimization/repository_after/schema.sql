CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    first_purchase_date DATE,
    country VARCHAR(100),
    segment VARCHAR(50)
);

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_category_id INTEGER REFERENCES categories(category_id)
);

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES categories(category_id),
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory (
    inventory_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id),
    warehouse_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    last_restock_date DATE,
    reorder_point INTEGER DEFAULT 10
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    order_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(50),
    shipping_address_id INTEGER
);

CREATE TABLE order_items (
    item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id),
    product_id INTEGER REFERENCES products(product_id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0
);

CREATE INDEX idx_orders_date_status_amount ON orders(order_date, status) 
INCLUDE (total_amount) WHERE status != 'cancelled';

CREATE INDEX idx_orders_date_status_id ON orders(order_date, status, order_id) 
WHERE status != 'cancelled';

CREATE INDEX idx_order_items_product_order ON order_items(product_id, order_id);

CREATE INDEX idx_orders_customer_status_date ON orders(customer_id, status, order_date) 
WHERE status != 'cancelled';

CREATE INDEX idx_inventory_product ON inventory(product_id) INCLUDE (quantity);
