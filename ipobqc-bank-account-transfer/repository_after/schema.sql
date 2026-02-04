-- Database schema for bank account transfer system

CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE transaction_ledger (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES accounts(id),
    dest_id INTEGER NOT NULL REFERENCES accounts(id),
    amount DECIMAL(15,2) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    request_id VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);