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
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN activity_type = 'LOGIN' THEN 1 ELSE 0 END), 0)::INT,
        COALESCE(SUM(CASE WHEN activity_type <> 'LOGIN' THEN 1 ELSE 0 END), 0)::INT,
        MAX(activity_time)
    FROM user_activity
    WHERE user_id = p_user_id
      AND activity_time >= CURRENT_DATE - p_days;
END;
$$;
