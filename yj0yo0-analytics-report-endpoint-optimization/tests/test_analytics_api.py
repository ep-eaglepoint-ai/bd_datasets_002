"""
Tests for analytics API optimization.
Tests fail for repository_before (slow), pass for repository_after (fast).
"""
import pytest
import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_app():
    """Get the Flask app based on TEST_IMPLEMENTATION environment variable."""
    impl = os.environ.get("TEST_IMPLEMENTATION", "after")
    
    if impl == "before":
        from repository_before.analytics_api import app
    else:
        from repository_after.analytics_api import app
    
    return app


class TestRequirement1ResponseTime:
    """Requirement 1: Improve API response time."""

    def test_response_time_under_threshold(self):
        """API must respond in under 2 seconds (before has 2.5s+ delays)."""
        app = get_app()
        client = app.test_client()
        
        start = time.time()
        response = client.get("/api/v1/user-analytics/report?user_id=test123")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 2.0, f"Response took {elapsed:.2f}s, must be under 2s"


class TestRequirement2NoDelays:
    """Requirement 2: Eliminate unnecessary delays."""

    def test_no_artificial_sleep_delays(self):
        """API must not have artificial time.sleep delays."""
        impl = os.environ.get("TEST_IMPLEMENTATION", "after")
        
        if impl == "before":
            path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               "repository_before", "analytics_api.py")
        else:
            path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               "repository_after", "analytics_api.py")
        
        with open(path, "r") as f:
            source = f.read()
        
        sleep_count = source.count("time.sleep")
        assert sleep_count == 0, f"Found {sleep_count} time.sleep calls, must have 0"


class TestRequirement3Complexity:
    """Requirement 3: Reduce computational complexity."""

    def test_no_nested_loop_counting(self):
        """Must not use O(n^2) nested loop for counting events."""
        impl = os.environ.get("TEST_IMPLEMENTATION", "after")
        
        if impl == "before":
            path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               "repository_before", "analytics_api.py")
        else:
            path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               "repository_after", "analytics_api.py")
        
        with open(path, "r") as f:
            source = f.read()
        
        has_nested_loop = "for event in user_events:" in source and "for compare_event in user_events:" in source
        assert not has_nested_loop, "Must not use O(n^2) nested loops for counting"


class TestRequirement4MemoryUsage:
    """Requirement 4: Optimize memory usage."""

    def test_no_full_event_list_storage(self):
        """Must not store full 20000 event objects in memory."""
        impl = os.environ.get("TEST_IMPLEMENTATION", "after")
        
        if impl == "before":
            path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               "repository_before", "analytics_api.py")
        else:
            path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               "repository_after", "analytics_api.py")
        
        with open(path, "r") as f:
            source = f.read()
        
        stores_events = "user_events.append(" in source or "user_events = []" in source
        assert not stores_events, "Must not store full event list in memory"


class TestRequirement5ResponseStructure:
    """Requirement 5: Maintain the same API response structure."""

    def test_response_has_required_fields(self):
        """Response must have all required fields."""
        app = get_app()
        client = app.test_client()
        
        response = client.get("/api/v1/user-analytics/report?user_id=test123")
        data = response.get_json()
        
        required_fields = [
            "user_id",
            "report_generated_at",
            "event_counts",
            "total_events",
            "scores_generated",
            "processing_time_seconds",
            "status"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

    def test_event_counts_structure(self):
        """Event counts must have click, view, purchase keys."""
        app = get_app()
        client = app.test_client()
        
        response = client.get("/api/v1/user-analytics/report?user_id=test123")
        data = response.get_json()
        
        assert "event_counts" in data
        for event_type in ["click", "view", "purchase"]:
            assert event_type in data["event_counts"], f"Missing event type: {event_type}"

    def test_user_id_preserved(self):
        """User ID from request must be in response."""
        app = get_app()
        client = app.test_client()
        
        response = client.get("/api/v1/user-analytics/report?user_id=myuser123")
        data = response.get_json()
        
        assert data["user_id"] == "myuser123"

    def test_status_completed(self):
        """Status must be 'completed'."""
        app = get_app()
        client = app.test_client()
        
        response = client.get("/api/v1/user-analytics/report?user_id=test")
        data = response.get_json()
        
        assert data["status"] == "completed"


class TestRequirement6Scalability:
    """Requirement 6: Ensure scalability for concurrent requests."""

    def test_total_events_correct(self):
        """Total events must be 20000."""
        app = get_app()
        client = app.test_client()
        
        response = client.get("/api/v1/user-analytics/report?user_id=test")
        data = response.get_json()
        
        assert data["total_events"] == 20000

    def test_event_counts_sum_to_total(self):
        """Event counts must sum to total events."""
        app = get_app()
        client = app.test_client()
        
        response = client.get("/api/v1/user-analytics/report?user_id=test")
        data = response.get_json()
        
        total_from_counts = sum(data["event_counts"].values())
        assert total_from_counts == data["total_events"], \
            f"Event counts sum ({total_from_counts}) != total_events ({data['total_events']})"


class TestRequirement7CleanCode:
    """Requirement 7: Use clean and efficient Python code."""

    def test_no_string_concatenation_loop(self):
        """Must not use inefficient string concatenation in loop."""
        impl = os.environ.get("TEST_IMPLEMENTATION", "after")
        
        if impl == "before":
            path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               "repository_before", "analytics_api.py")
        else:
            path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               "repository_after", "analytics_api.py")
        
        with open(path, "r") as f:
            source = f.read()
        
        has_audit_log_concat = 'audit_log += ' in source or 'audit_log = ""' in source
        assert not has_audit_log_concat, "Must not use inefficient string concatenation"
