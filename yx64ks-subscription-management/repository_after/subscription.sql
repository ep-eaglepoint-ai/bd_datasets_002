CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    plan_id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    price_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(plan_id),
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'pending')),
    start_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS subscription_history (
    history_id BIGSERIAL PRIMARY KEY,
    subscription_id UUID NOT NULL,
    user_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    status TEXT NOT NULL,
    change_type TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_idempotency_log (
    request_identifier UUID PRIMARY KEY,
    response_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_audit_log (
    audit_id BIGSERIAL PRIMARY KEY,
    operation_name TEXT NOT NULL,
    request_identifier UUID,
    user_id UUID,
    details JSONB,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION manage_user_subscription(
    p_user_id UUID,
    p_plan_id UUID,
    p_start_date TIMESTAMPTZ,
    p_status TEXT,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_existing_sub_id UUID;
    v_current_status TEXT;
    v_current_plan UUID;
    v_plan_is_active BOOLEAN;
    v_user_exists BOOLEAN;
    v_new_sub_id UUID;
    v_history_type TEXT;
    v_result_json JSONB;
    v_idempotency_record JSONB;
    
    c_sqlite_ok CONSTANT INTEGER := 0;
    c_sqlite_error CONSTANT INTEGER := 1;
    c_sqlite_constraint CONSTANT INTEGER := 19;
    c_sqlite_misuse CONSTANT INTEGER := 21;

BEGIN
    IF p_request_id IS NULL THEN
        RETURN jsonb_build_object(
            'result_code', c_sqlite_misuse,
            'message', 'Request identifier is required'
        );
    END IF;

    SELECT response_payload INTO v_idempotency_record
    FROM subscription_idempotency_log
    WHERE request_identifier = p_request_id;

    IF v_idempotency_record IS NOT NULL THEN
        RETURN v_idempotency_record;
    END IF;

    IF p_user_id IS NULL OR p_plan_id IS NULL OR p_start_date IS NULL OR p_status IS NULL THEN
        v_result_json := jsonb_build_object(
            'result_code', c_sqlite_misuse,
            'message', 'Missing required parameters'
        );
        INSERT INTO subscription_idempotency_log (request_identifier, response_payload)
        VALUES (p_request_id, v_result_json)
        ON CONFLICT (request_identifier) DO NOTHING;
        RETURN v_result_json;
    END IF;

    IF p_status NOT IN ('active', 'cancelled', 'past_due', 'pending') THEN
         v_result_json := jsonb_build_object(
            'result_code', c_sqlite_constraint,
            'message', 'Invalid status value'
        );
        INSERT INTO subscription_idempotency_log (request_identifier, response_payload)
        VALUES (p_request_id, v_result_json)
        ON CONFLICT (request_identifier) DO NOTHING;
        RETURN v_result_json;
    END IF;

    SELECT EXISTS(SELECT 1 FROM users WHERE user_id = p_user_id) INTO v_user_exists;
    IF NOT v_user_exists THEN
        v_result_json := jsonb_build_object(
            'result_code', c_sqlite_constraint,
            'message', 'User does not exist'
        );
        INSERT INTO subscription_idempotency_log (request_identifier, response_payload)
        VALUES (p_request_id, v_result_json)
        ON CONFLICT (request_identifier) DO NOTHING;
        RETURN v_result_json;
    END IF;

    SELECT is_active INTO v_plan_is_active
    FROM subscription_plans
    WHERE plan_id = p_plan_id;

    IF v_plan_is_active IS NULL THEN
        v_result_json := jsonb_build_object(
            'result_code', c_sqlite_constraint,
            'message', 'Plan does not exist'
        );
        INSERT INTO subscription_idempotency_log (request_identifier, response_payload)
        VALUES (p_request_id, v_result_json)
        ON CONFLICT (request_identifier) DO NOTHING;
        RETURN v_result_json;
    ELSIF NOT v_plan_is_active THEN
        v_result_json := jsonb_build_object(
            'result_code', c_sqlite_constraint,
            'message', 'Plan is not active'
        );
        INSERT INTO subscription_idempotency_log (request_identifier, response_payload)
        VALUES (p_request_id, v_result_json)
        ON CONFLICT (request_identifier) DO NOTHING;
        RETURN v_result_json;
    END IF;

    SELECT subscription_id, status, plan_id 
    INTO v_existing_sub_id, v_current_status, v_current_plan
    FROM subscriptions
    WHERE user_id = p_user_id
    FOR UPDATE;

    BEGIN
        IF v_existing_sub_id IS NOT NULL THEN
            IF v_current_status = 'cancelled' AND p_status = 'past_due' THEN
                 RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'Cannot transition from cancelled to past_due';
            END IF;

            UPDATE subscriptions
            SET plan_id = p_plan_id,
                status = p_status,
                start_date = p_start_date,
                updated_at = NOW()
            WHERE subscription_id = v_existing_sub_id;

            v_new_sub_id := v_existing_sub_id;
            v_history_type := 'UPDATE';
        ELSE
            INSERT INTO subscriptions (user_id, plan_id, status, start_date)
            VALUES (p_user_id, p_plan_id, p_status, p_start_date)
            RETURNING subscription_id INTO v_new_sub_id;

            v_history_type := 'CREATE';
        END IF;

        INSERT INTO subscription_history (subscription_id, user_id, plan_id, status, change_type)
        VALUES (v_new_sub_id, p_user_id, p_plan_id, p_status, v_history_type);

        INSERT INTO subscription_audit_log (operation_name, request_identifier, user_id, details)
        VALUES (
            'manage_user_subscription', 
            p_request_id, 
            p_user_id, 
            jsonb_build_object('action', v_history_type, 'plan_id', p_plan_id, 'status', p_status)
        );

        v_result_json := jsonb_build_object(
            'result_code', c_sqlite_ok,
            'message', 'Success',
            'subscription_id', v_new_sub_id,
            'action', v_history_type
        );

        INSERT INTO subscription_idempotency_log (request_identifier, response_payload)
        VALUES (p_request_id, v_result_json)
        ON CONFLICT (request_identifier) DO NOTHING;

        RETURN v_result_json;

    EXCEPTION 
        WHEN OTHERS THEN
            DECLARE
                v_err_msg TEXT;
                v_err_state TEXT;
            BEGIN
                GET STACKED DIAGNOSTICS v_err_msg = MESSAGE_TEXT, v_err_state = RETURNED_SQLSTATE;
                
                v_result_json := jsonb_build_object(
                    'result_code', CASE WHEN v_err_state = '22000' OR v_err_state = '23505' THEN c_sqlite_constraint ELSE c_sqlite_error END,
                    'message', v_err_msg,
                    'sql_state', v_err_state
                );
                
                INSERT INTO subscription_idempotency_log (request_identifier, response_payload)
                VALUES (p_request_id, v_result_json)
                ON CONFLICT (request_identifier) DO NOTHING;
                
                RETURN v_result_json;
            END;
    END;
END;
$$;