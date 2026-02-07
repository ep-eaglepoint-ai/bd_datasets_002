-- Initialize database schema for inventory system

CREATE TABLE IF NOT EXISTS inventory (
    product_id VARCHAR(50) PRIMARY KEY,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_audit (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    delta INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    user_id VARCHAR(100) NOT NULL DEFAULT 'system',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO inventory (product_id, stock_quantity) VALUES
    ('PRODUCT-001', 100),
    ('PRODUCT-002', 50),
    ('PRODUCT-003', 200)
ON CONFLICT (product_id) DO NOTHING;
