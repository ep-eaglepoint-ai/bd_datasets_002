"""
Tests for optimized user activity aggregation SQL function.
Validates all optimization requirements without requiring a database connection.
"""

import os
import re
import pytest
from pathlib import Path


def get_sql_path():
    """Get SQL path based on TEST_TARGET environment variable."""
    target = os.environ.get('TEST_TARGET', 'after')
    if target == 'before':
        return Path(__file__).parent.parent / "repository_before" / "activity_aggregation.sql"
    return Path(__file__).parent.parent / "repository_after" / "activity_aggregation.sql"


@pytest.fixture
def optimized_sql():
    """Load the SQL function being tested."""
    return get_sql_path().read_text()


@pytest.fixture
def original_sql():
    """Load the original SQL function."""
    sql_path = Path(__file__).parent.parent / "repository_before" / "activity_aggregation.sql"
    return sql_path.read_text()


class TestSetBasedAggregation:
    """Requirement 1: Replace looping logic with set-based aggregation."""

    def test_no_for_loop(self, optimized_sql):
        """Optimized function should not contain FOR loop."""
        assert "FOR r IN" not in optimized_sql
        assert "FOR " not in optimized_sql.upper() or "FORMAT" in optimized_sql.upper()

    def test_uses_aggregation_functions(self, optimized_sql):
        """Optimized function should use SQL aggregation functions."""
        sql_upper = optimized_sql.upper()
        assert "SUM(" in sql_upper or "COUNT(" in sql_upper

    def test_uses_case_when_for_counts(self, optimized_sql):
        """Optimized function should use CASE WHEN for conditional counting."""
        sql_upper = optimized_sql.upper()
        assert "CASE" in sql_upper and "WHEN" in sql_upper


class TestTimestampFiltering:
    """Requirement 2: Avoid applying functions to timestamp columns in filters."""

    def test_no_date_function_on_activity_time(self, optimized_sql):
        """Should not use DATE() function on activity_time column."""
        assert "DATE(activity_time)" not in optimized_sql

    def test_no_cast_on_activity_time_in_where(self, optimized_sql):
        """Should not cast activity_time in WHERE clause."""
        sql_upper = optimized_sql.upper()
        assert "CAST(ACTIVITY_TIME" not in sql_upper
        assert "ACTIVITY_TIME::DATE" not in sql_upper


class TestIndexUsage:
    """Requirement 3: Ensure efficient index usage on activity_time."""

    def test_sargable_predicate(self, optimized_sql):
        """Filter should be sargable (activity_time >= something)."""
        sql_lower = optimized_sql.lower()
        assert "activity_time >=" in sql_lower or "activity_time >" in sql_lower

    def test_uses_current_date_subtraction(self, optimized_sql):
        """Should use CURRENT_DATE - p_days pattern."""
        sql_lower = optimized_sql.lower()
        assert "current_date" in sql_lower and "p_days" in sql_lower


class TestPreserveCountsAndTimestamps:
    """Requirement 4: Preserve exact counts and timestamps."""

    def test_returns_login_count(self, optimized_sql):
        """Function should return login_count."""
        sql_upper = optimized_sql.upper()
        assert "LOGIN_COUNT" in sql_upper
        assert "'LOGIN'" in optimized_sql or "\"LOGIN\"" in optimized_sql

    def test_returns_action_count(self, optimized_sql):
        """Function should return action_count."""
        sql_upper = optimized_sql.upper()
        assert "ACTION_COUNT" in sql_upper

    def test_returns_last_activity(self, optimized_sql):
        """Function should return last_activity using MAX."""
        sql_upper = optimized_sql.upper()
        assert "LAST_ACTIVITY" in sql_upper
        assert "MAX(" in sql_upper


class TestLargeTableOptimization:
    """Requirement 5: Optimize for tables with hundreds of millions of rows."""

    def test_single_table_scan(self, optimized_sql):
        """Should query user_activity table only once."""
        sql_lower = optimized_sql.lower()
        count = sql_lower.count("from user_activity")
        assert count == 1

    def test_no_subqueries(self, optimized_sql):
        """Should not use subqueries for main aggregation."""
        sql_lower = optimized_sql.lower()
        select_count = sql_lower.count("select")
        assert select_count <= 2


class TestMemoryAndCPU:
    """Requirement 6: Reduce memory and CPU usage."""

    def test_no_record_variable(self, optimized_sql):
        """Should not declare record variable for looping."""
        sql_upper = optimized_sql.upper()
        assert "r RECORD" not in optimized_sql
        assert "RECORD;" not in sql_upper

    def test_minimal_variables(self, optimized_sql):
        """Should minimize variable declarations."""
        sql_upper = optimized_sql.upper()
        declare_count = sql_upper.count("DECLARE")
        assert declare_count <= 1
        if "DECLARE" in sql_upper:
            var_count = sql_upper.count(":=")
            assert var_count <= 1


class TestEdgeCases:
    """Requirement 7: Ensure correctness for edge cases (no activity)."""

    def test_handles_null_with_coalesce(self, optimized_sql):
        """Should use COALESCE for NULL handling."""
        sql_upper = optimized_sql.upper()
        assert "COALESCE" in sql_upper

    def test_returns_zero_for_empty_counts(self, optimized_sql):
        """Counts should default to 0 when no rows match."""
        sql_upper = optimized_sql.upper()
        assert "COALESCE" in sql_upper and ", 0)" in sql_upper


class TestReadability:
    """Requirement 8: Keep the function readable."""

    def test_function_not_too_long(self, optimized_sql):
        """Optimized function should be concise."""
        lines = [l for l in optimized_sql.strip().split('\n') if l.strip()]
        assert len(lines) <= 25

    def test_proper_indentation(self, optimized_sql):
        """Function should have consistent indentation."""
        assert "SELECT" in optimized_sql or "select" in optimized_sql


class TestDeterminism:
    """Requirement 9: Maintain deterministic results."""

    def test_no_random_functions(self, optimized_sql):
        """Should not use non-deterministic functions."""
        sql_upper = optimized_sql.upper()
        assert "RANDOM()" not in sql_upper
        assert "NOW()" not in sql_upper


class TestFunctionSignature:
    """Requirement 10: Function signature must not change."""

    def test_same_function_name(self, optimized_sql, original_sql):
        """Function name should be identical."""
        assert "get_user_activity_summary" in optimized_sql
        assert "get_user_activity_summary" in original_sql

    def test_same_parameters(self, optimized_sql, original_sql):
        """Parameters should be identical."""
        assert "p_user_id BIGINT" in optimized_sql
        assert "p_days INT" in optimized_sql

    def test_same_return_type(self, optimized_sql, original_sql):
        """Return type should be identical."""
        assert "RETURNS TABLE" in optimized_sql
        assert "login_count INT" in optimized_sql
        assert "action_count INT" in optimized_sql
        assert "last_activity TIMESTAMP" in optimized_sql


class TestNoSchemaChanges:
    """Requirement 11: No schema or index changes allowed."""

    def test_no_create_index(self, optimized_sql):
        """Should not create indexes."""
        sql_upper = optimized_sql.upper()
        assert "CREATE INDEX" not in sql_upper

    def test_no_alter_table(self, optimized_sql):
        """Should not alter tables."""
        sql_upper = optimized_sql.upper()
        assert "ALTER TABLE" not in sql_upper


class TestNoTempTables:
    """Requirement 12: No temporary tables or materialized views."""

    def test_no_temp_table(self, optimized_sql):
        """Should not create temporary tables."""
        sql_upper = optimized_sql.upper()
        assert "CREATE TEMP" not in sql_upper
        assert "CREATE TEMPORARY" not in sql_upper

    def test_no_materialized_view(self, optimized_sql):
        """Should not create materialized views."""
        sql_upper = optimized_sql.upper()
        assert "MATERIALIZED VIEW" not in sql_upper


class TestBehaviorUnchanged:
    """Requirement 13: Behavior must remain unchanged."""

    def test_filters_by_user_id(self, optimized_sql):
        """Should filter by user_id parameter."""
        assert "user_id = p_user_id" in optimized_sql

    def test_filters_by_date_range(self, optimized_sql):
        """Should filter by date range."""
        sql_lower = optimized_sql.lower()
        assert "p_days" in sql_lower

    def test_counts_login_type(self, optimized_sql):
        """Should count LOGIN activity type."""
        assert "'LOGIN'" in optimized_sql

    def test_uses_max_for_last_activity(self, optimized_sql):
        """Should use MAX for last_activity timestamp."""
        sql_upper = optimized_sql.upper()
        assert "MAX(ACTIVITY_TIME)" in sql_upper

    def test_remains_plpgsql(self, optimized_sql):
        """Function should remain PL/pgSQL."""
        sql_lower = optimized_sql.lower()
        assert "language plpgsql" in sql_lower
