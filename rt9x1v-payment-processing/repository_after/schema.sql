DROP TABLE IF EXISTS payment_audit_log CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL,
    payment_timestamp TIMESTAMP NOT NULL,
    request_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_audit_log (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    payment_id INTEGER REFERENCES payments(id),
    action TEXT NOT NULL,
    log_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
