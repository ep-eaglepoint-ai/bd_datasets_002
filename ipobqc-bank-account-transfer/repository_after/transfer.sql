-- Function to transfer funds between accounts

CREATE OR REPLACE FUNCTION transfer_funds(
    source_id INTEGER,
    dest_id INTEGER,
    amount DECIMAL(15,2),
    transfer_ts TIMESTAMP,
    request_id VARCHAR(255)
)
RETURNS TABLE(status TEXT, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    source_balance DECIMAL(15,2);
    dest_balance DECIMAL(15,2);
    source_active BOOLEAN;
    dest_active BOOLEAN;
    ledger_exists BOOLEAN;
BEGIN
    -- Check for same account
    IF source_id = dest_id THEN
        RETURN QUERY SELECT 'ERROR'::TEXT, 'Source and destination accounts must be different'::TEXT;
        RETURN;
    END IF;

    -- Check for idempotency
    SELECT EXISTS(SELECT 1 FROM transaction_ledger WHERE transaction_ledger.request_id = transfer_funds.request_id) INTO ledger_exists;
    IF ledger_exists THEN
        RETURN QUERY SELECT 'SUCCESS'::TEXT, 'Transfer already processed'::TEXT;
        RETURN;
    END IF;

    -- Lock accounts in order to avoid deadlocks
    PERFORM id FROM accounts WHERE id IN (source_id, dest_id) ORDER BY id FOR UPDATE;

    -- Validate accounts exist and are active
    SELECT balance, active INTO source_balance, source_active FROM accounts WHERE id = source_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'ERROR'::TEXT, 'Source account does not exist'::TEXT;
        RETURN;
    END IF;
    IF NOT source_active THEN
        RETURN QUERY SELECT 'ERROR'::TEXT, 'Source account is not active'::TEXT;
        RETURN;
    END IF;

    SELECT balance, active INTO dest_balance, dest_active FROM accounts WHERE id = dest_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'ERROR'::TEXT, 'Destination account does not exist'::TEXT;
        RETURN;
    END IF;
    IF NOT dest_active THEN
        RETURN QUERY SELECT 'ERROR'::TEXT, 'Destination account is not active'::TEXT;
        RETURN;
    END IF;

    -- Validate amount
    IF amount <= 0 THEN
        RETURN QUERY SELECT 'ERROR'::TEXT, 'Transfer amount must be positive'::TEXT;
        RETURN;
    END IF;

    -- Check sufficient balance
    IF source_balance < amount THEN
        RETURN QUERY SELECT 'ERROR'::TEXT, 'Insufficient balance'::TEXT;
        RETURN;
    END IF;

    -- Perform transfer
    UPDATE accounts SET balance = balance - amount WHERE id = source_id;
    UPDATE accounts SET balance = balance + amount WHERE id = dest_id;

    -- Record in ledger
    INSERT INTO transaction_ledger (source_id, dest_id, amount, timestamp, request_id)
    VALUES (source_id, dest_id, amount, transfer_ts, request_id);

    -- Audit log
    INSERT INTO audit_log (action, details, timestamp)
    VALUES ('TRANSFER', format('Source: %s, Dest: %s, Amount: %s, Request: %s', source_id, dest_id, amount, request_id), NOW());

    RETURN QUERY SELECT 'SUCCESS'::TEXT, 'Transfer completed'::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 'ERROR'::TEXT, 'An error occurred: ' || SQLERRM;
END;
$$;