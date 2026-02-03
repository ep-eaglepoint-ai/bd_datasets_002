CREATE OR REPLACE FUNCTION initiate_password_reset(
    p_user_id UUID,
    p_reset_token VARCHAR(255),
    p_expires_at TIMESTAMP WITH TIME ZONE,
    p_request_id VARCHAR(255)
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_exists BOOLEAN;
    v_user_active BOOLEAN;
    v_existing_request RECORD;
    v_invalidated_count INTEGER;
    v_token_id UUID;
    v_result JSONB;
    SQLITE_OK CONSTANT INTEGER := 0;
    SQLITE_ERROR CONSTANT INTEGER := 1;
    SQLITE_NOTFOUND CONSTANT INTEGER := 12;
    SQLITE_CONSTRAINT CONSTANT INTEGER := 19;
    SQLITE_MISMATCH CONSTANT INTEGER := 20;
BEGIN
    IF p_user_id IS NULL THEN
        v_result := jsonb_build_object(
            'success', FALSE,
            'error_code', SQLITE_MISMATCH,
            'error_message', 'User ID cannot be null',
            'data', NULL
        );
        
        INSERT INTO password_reset_logs (user_id, request_id, action, details, error_code)
        VALUES (NULL, p_request_id, 'RESET_INITIATION_FAILED', 
                jsonb_build_object('reason', 'null_user_id'), SQLITE_MISMATCH);
        
        RETURN v_result;
    END IF;
    
    IF p_reset_token IS NULL OR p_reset_token = '' THEN
        v_result := jsonb_build_object(
            'success', FALSE,
            'error_code', SQLITE_MISMATCH,
            'error_message', 'Reset token cannot be null or empty',
            'data', NULL
        );
        
        INSERT INTO password_reset_logs (user_id, request_id, action, details, error_code)
        VALUES (p_user_id, p_request_id, 'RESET_INITIATION_FAILED', 
                jsonb_build_object('reason', 'null_or_empty_token'), SQLITE_MISMATCH);
        
        RETURN v_result;
    END IF;
    
    IF p_expires_at IS NULL THEN
        v_result := jsonb_build_object(
            'success', FALSE,
            'error_code', SQLITE_MISMATCH,
            'error_message', 'Expiration timestamp cannot be null',
            'data', NULL
        );
        
        INSERT INTO password_reset_logs (user_id, request_id, action, details, error_code)
        VALUES (p_user_id, p_request_id, 'RESET_INITIATION_FAILED', 
                jsonb_build_object('reason', 'null_expiration'), SQLITE_MISMATCH);
        
        RETURN v_result;
    END IF;
    
    IF p_request_id IS NULL OR p_request_id = '' THEN
        v_result := jsonb_build_object(
            'success', FALSE,
            'error_code', SQLITE_MISMATCH,
            'error_message', 'Request ID cannot be null or empty',
            'data', NULL
        );
        
        INSERT INTO password_reset_logs (user_id, request_id, action, details, error_code)
        VALUES (p_user_id, NULL, 'RESET_INITIATION_FAILED', 
                jsonb_build_object('reason', 'null_or_empty_request_id'), SQLITE_MISMATCH);
        
        RETURN v_result;
    END IF;

    SELECT id, user_id, token, expires_at, is_active, created_at
    INTO v_existing_request
    FROM password_reset_tokens
    WHERE request_id = p_request_id;
    
    IF FOUND THEN
        v_result := jsonb_build_object(
            'success', TRUE,
            'error_code', SQLITE_OK,
            'error_message', NULL,
            'data', jsonb_build_object(
                'token_id', v_existing_request.id,
                'user_id', v_existing_request.user_id,
                'token', v_existing_request.token,
                'expires_at', v_existing_request.expires_at,
                'is_active', v_existing_request.is_active,
                'created_at', v_existing_request.created_at,
                'idempotent', TRUE
            )
        );
        
        INSERT INTO password_reset_logs (user_id, request_id, action, details, error_code)
        VALUES (v_existing_request.user_id, p_request_id, 'RESET_INITIATION_IDEMPOTENT', 
                jsonb_build_object('existing_token_id', v_existing_request.id), SQLITE_OK);
        
        RETURN v_result;
    END IF;

    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        v_result := jsonb_build_object(
            'success', FALSE,
            'error_code', SQLITE_NOTFOUND,
            'error_message', 'User not found',
            'data', NULL
        );
        
        INSERT INTO password_reset_logs (user_id, request_id, action, details, error_code)
        VALUES (p_user_id, p_request_id, 'RESET_INITIATION_FAILED', 
                jsonb_build_object('reason', 'user_not_found'), SQLITE_NOTFOUND);
        
        RETURN v_result;
    END IF;

    SELECT is_active INTO v_user_active FROM users WHERE id = p_user_id;
    
    IF NOT v_user_active THEN
        v_result := jsonb_build_object(
            'success', FALSE,
            'error_code', SQLITE_CONSTRAINT,
            'error_message', 'User account is not active',
            'data', NULL
        );
        
        INSERT INTO password_reset_logs (user_id, request_id, action, details, error_code)
        VALUES (p_user_id, p_request_id, 'RESET_INITIATION_FAILED', 
                jsonb_build_object('reason', 'user_inactive'), SQLITE_CONSTRAINT);
        
        RETURN v_result;
    END IF;

    UPDATE password_reset_tokens
    SET is_active = FALSE
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    GET DIAGNOSTICS v_invalidated_count = ROW_COUNT;

    IF v_invalidated_count > 0 THEN
        INSERT INTO password_reset_logs (user_id, request_id, action, details, error_code)
        VALUES (p_user_id, p_request_id, 'TOKENS_INVALIDATED', 
                jsonb_build_object('count', v_invalidated_count), SQLITE_OK);
    END IF;

    INSERT INTO password_reset_tokens (user_id, token, expires_at, is_active, request_id)
    VALUES (p_user_id, p_reset_token, p_expires_at, TRUE, p_request_id)
    RETURNING id INTO v_token_id;

    INSERT INTO password_reset_logs (user_id, request_id, action, details, error_code)
    VALUES (p_user_id, p_request_id, 'RESET_INITIATION_SUCCESS', 
            jsonb_build_object(
                'token_id', v_token_id,
                'expires_at', p_expires_at,
                'invalidated_tokens', v_invalidated_count
            ), SQLITE_OK);

    v_result := jsonb_build_object(
        'success', TRUE,
        'error_code', SQLITE_OK,
        'error_message', NULL,
        'data', jsonb_build_object(
            'token_id', v_token_id,
            'user_id', p_user_id,
            'token', p_reset_token,
            'expires_at', p_expires_at,
            'is_active', TRUE,
            'created_at', CURRENT_TIMESTAMP,
            'invalidated_tokens', v_invalidated_count,
            'idempotent', FALSE
        )
    );
    
    RETURN v_result;

EXCEPTION
    WHEN unique_violation THEN
        v_result := jsonb_build_object(
            'success', FALSE,
            'error_code', SQLITE_CONSTRAINT,
            'error_message', 'Duplicate token or request ID',
            'data', NULL
        );
        
        INSERT INTO password_reset_logs (user_id, request_id, action, details, error_code)
        VALUES (p_user_id, p_request_id, 'RESET_INITIATION_FAILED', 
                jsonb_build_object('reason', 'unique_violation'), SQLITE_CONSTRAINT);
        
        RETURN v_result;
        
    WHEN foreign_key_violation THEN
        v_result := jsonb_build_object(
            'success', FALSE,
            'error_code', SQLITE_CONSTRAINT,
            'error_message', 'Foreign key constraint violation',
            'data', NULL
        );
        
        INSERT INTO password_reset_logs (user_id, request_id, action, details, error_code)
        VALUES (p_user_id, p_request_id, 'RESET_INITIATION_FAILED', 
                jsonb_build_object('reason', 'foreign_key_violation'), SQLITE_CONSTRAINT);
        
        RETURN v_result;
        
    WHEN OTHERS THEN
        v_result := jsonb_build_object(
            'success', FALSE,
            'error_code', SQLITE_ERROR,
            'error_message', SQLERRM,
            'data', NULL
        );
        
        INSERT INTO password_reset_logs (user_id, request_id, action, details, error_code)
        VALUES (p_user_id, p_request_id, 'RESET_INITIATION_FAILED', 
                jsonb_build_object('reason', 'unexpected_error', 'message', SQLERRM), SQLITE_ERROR);
        
        RETURN v_result;
END;
$$;
