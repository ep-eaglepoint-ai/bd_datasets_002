-- Function to transfer funds between accounts

CREATE OR REPLACE FUNCTION transfer_funds(
    source_id INTEGER,
    dest_id INTEGER,
    amount DECIMAL(15,2),
    transfer_ts TIMESTAMP,
    request_id VARCHAR(255)
)
RETURNS TABLE(status INTEGER, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    source_balance DECIMAL(15,2);
    dest_balance DECIMAL(15,2);
    source_active BOOLEAN;
    dest_active BOOLEAN;
    ledger_id INTEGER;
BEGIN
    -- Input validation
    IF source_id IS NULL OR dest_id IS NULL OR amount IS NULL OR request_id IS NULL OR request_id = '' THEN
        RETURN QUERY SELECT 1, 'Invalid input parameters';
        RETURN;
    END IF;

    -- Check for same account
    IF source_id = dest_id THEN
        RETURN QUERY SELECT 1, 'Source and destination accounts must be different';
        RETURN;
    END IF;

    -- Lock accounts in order to avoid deadlocks
    PERFORM id FROM accounts WHERE id IN (source_id, dest_id) ORDER BY id FOR UPDATE;

    -- Validate accounts exist and are active
    SELECT balance, active INTO source_balance, source_active FROM accounts WHERE id = source_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 1, 'Source account does not exist';
        RETURN;
    END IF;
    IF NOT source_active THEN
        RETURN QUERY SELECT 1, 'Source account is not active';
        RETURN;
    END IF;

    SELECT balance, active INTO dest_balance, dest_active FROM accounts WHERE id = dest_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 1, 'Destination account does not exist';
        RETURN;
    END IF;
    IF NOT dest_active THEN
        RETURN QUERY SELECT 1, 'Destination account is not active';
        RETURN;
    END IF;

    -- Validate amount
    IF amount <= 0 THEN
        RETURN QUERY SELECT 1, 'Transfer amount must be positive';
        RETURN;
    END IF;

    -- Check sufficient balance
    IF source_balance < amount THEN
        RETURN QUERY SELECT 1, 'Insufficient balance';
        RETURN;
    END IF;

    -- Attempt to record in ledger (idempotency check)
    BEGIN
        INSERT INTO transaction_ledger (source_id, dest_id, amount, timestamp, request_id)
        VALUES (source_id, dest_id, amount, transfer_ts, request_id);
    EXCEPTION
        WHEN unique_violation THEN
            -- Transfer already processed
            RETURN QUERY SELECT 0, 'Transfer already processed';
            RETURN;
    END;

    -- Perform transfer
    UPDATE accounts SET balance = balance - amount WHERE id = source_id;
    UPDATE accounts SET balance = balance + amount WHERE id = dest_id;

    -- Audit log
    INSERT INTO audit_log (action, details, timestamp)
    VALUES ('TRANSFER', 'Transfer from ' || source_id || ' to ' || dest_id || ' amount ' || amount || ' request ' || request_id, NOW());

    RETURN QUERY SELECT 0, 'Transfer completed';

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 1, 'An error occurred: ' || SQLERRM;
END;
$$;