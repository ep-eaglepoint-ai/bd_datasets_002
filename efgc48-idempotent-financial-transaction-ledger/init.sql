-- Create accounts table
CREATE TABLE accounts (
    account_id VARCHAR(255) PRIMARY KEY,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00
);

-- Create idempotency_keys table
CREATE TABLE idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) NOT NULL,
    result BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_idempotency_keys_created_at ON idempotency_keys (created_at);