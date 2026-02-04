-- Function to transfer funds between accounts with SQLite-style error codes

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
    v_req TEXT;
    r RECORD;

    -- SQLite-style error codes
    c_ok         CONSTANT INTEGER := 0;   -- SQLITE_OK
    c_error      CONSTANT INTEGER := 1;   -- SQLITE_ERROR
    c_abort      CONSTANT INTEGER := 4;   -- SQLITE_ABORT
    c_busy       CONSTANT INTEGER := 5;   -- SQLITE_BUSY
    c_notfound   CONSTANT INTEGER := 12;  -- SQLITE_NOTFOUND
    c_constraint CONSTANT INTEGER := 19;  -- SQLITE_CONSTRAINT
    c_mismatch   CONSTANT INTEGER := 20;  -- SQLITE_MISMATCH

BEGIN
    -- Input validation (untrusted input)
    v_req := btrim(request_id);

    IF source_id IS NULL
       OR dest_id IS NULL
       OR amount IS NULL
       OR transfer_ts IS NULL
       OR v_req IS NULL
       OR v_req = '' THEN
        RETURN QUERY SELECT c_mismatch, 'Invalid input parameters';
        RETURN;
    END IF;

    -- Check for same account
    IF source_id = dest_id THEN
        RETURN QUERY SELECT c_constraint, 'Source and destination accounts must be different';
        RETURN;
    END IF;

    -- Validate amount
    IF amount <= 0 THEN
        RETURN QUERY SELECT c_mismatch, 'Transfer amount must be positive';
        RETURN;
    END IF;

    -- Concurrency: lock BOTH account rows in deterministic order
    FOR r IN
        SELECT a.id
        FROM accounts a
        WHERE a.id IN (source_id, dest_id)
        ORDER BY a.id
        FOR UPDATE
    LOOP
        NULL;
    END LOOP;

    -- Validate source account exists and is active
    SELECT balance, active INTO source_balance, source_active FROM accounts WHERE id = source_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT c_notfound, 'Source account does not exist';
        RETURN;
    END IF;
    IF NOT source_active THEN
        RETURN QUERY SELECT c_constraint, 'Source account is not active';
        RETURN;
    END IF;

    -- Validate destination account exists and is active
    SELECT balance, active INTO dest_balance, dest_active FROM accounts WHERE id = dest_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT c_notfound, 'Destination account does not exist';
        RETURN;
    END IF;
    IF NOT dest_active THEN
        RETURN QUERY SELECT c_constraint, 'Destination account is not active';
        RETURN;
    END IF;

    -- Check sufficient balance
    IF source_balance < amount THEN
        RETURN QUERY SELECT c_abort, 'Insufficient balance';
        RETURN;
    END IF;

    -- Idempotency check: if already processed, return success
    IF EXISTS (SELECT 1 FROM transaction_ledger WHERE transaction_ledger.request_id = v_req) THEN
        RETURN QUERY SELECT c_ok, 'Transfer already processed';
        RETURN;
    END IF;

    -- Attempt to record in ledger (idempotency check)
    INSERT INTO transaction_ledger (source_id, dest_id, amount, timestamp, request_id)
    VALUES (source_id, dest_id, amount, transfer_ts, v_req);

    -- Perform transfer
    UPDATE accounts SET balance = balance - amount WHERE id = source_id;
    UPDATE accounts SET balance = balance + amount WHERE id = dest_id;

    -- Audit log
    INSERT INTO audit_log (action, details, timestamp)
    VALUES (
        'TRANSFER',
        'source=' || source_id || ' dest=' || dest_id || ' amount=' || amount || ' request_id=' || v_req || ' transfer_ts=' || transfer_ts,
        NOW()
    );

    RETURN QUERY SELECT c_ok, 'Transfer completed';
    RETURN;

EXCEPTION
    WHEN deadlock_detected OR serialization_failure OR lock_not_available THEN
        RETURN QUERY SELECT c_busy, 'Concurrent update conflict (retry)';
        RETURN;

    WHEN unique_violation THEN
        RETURN QUERY SELECT c_constraint, 'Constraint violation';
        RETURN;

    WHEN OTHERS THEN
        RETURN QUERY SELECT c_error, 'Unexpected error';
        RETURN;
END;
$$;
