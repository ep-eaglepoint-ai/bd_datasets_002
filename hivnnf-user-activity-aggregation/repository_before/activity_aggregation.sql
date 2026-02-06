CREATE OR REPLACE FUNCTION get_user_activity_summary(
    p_user_id BIGINT,
    p_days INT
)
RETURNS TABLE(
    login_count INT,
    action_count INT,
    last_activity TIMESTAMP
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_login_count INT := 0;
    v_action_count INT := 0;
    v_last_activity TIMESTAMP;
    r RECORD;
BEGIN
    FOR r IN
        SELECT activity_type, activity_time
        FROM user_activity
        WHERE user_id = p_user_id
          AND DATE(activity_time) >= CURRENT_DATE - p_days
    LOOP
        IF r.activity_type = 'LOGIN' THEN
            v_login_count := v_login_count + 1;
        ELSE
            v_action_count := v_action_count + 1;
        END IF;

        IF v_last_activity IS NULL OR r.activity_time > v_last_activity THEN
            v_last_activity := r.activity_time;
        END IF;
    END LOOP;

    RETURN QUERY
    SELECT
        v_login_count,
        v_action_count,
        v_last_activity;
END;
$$;
