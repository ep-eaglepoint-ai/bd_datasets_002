import pytest
from fastapi.testclient import TestClient

# REQ-01: Accept long URL, generate short code
# REQ-02: Redirect users
# REQ-05: Idempotency (Same input -> Same output)
# Critical Scenarios

class TestIntegration:
    
    def test_create_short_url_api(self, client: TestClient):
        """REQ-01: Basic shortening API test."""
        long_url = "https://www.google.com/search?q=test"
        response = client.post("/api/shorten", json={"target_url": long_url})
        assert response.status_code == 200
        data = response.json()
        assert "short_code" in data
        assert "short_url" in data
        assert len(data["short_code"]) >= 5

    def test_create_short_url_idempotency(self, client: TestClient):
        """REQ-05: Exact same URL should return same code."""
        long_url = "https://www.duplicate.com/resource"
        resp1 = client.post("/api/shorten", json={"target_url": long_url})
        assert resp1.status_code == 200
        code1 = resp1.json()["short_code"]
        
        # Second call
        resp2 = client.post("/api/shorten", json={"target_url": long_url})
        assert resp2.status_code == 200
        code2 = resp2.json()["short_code"]
        
        assert code1 == code2, "Short codes must be identical for same URL"

    def test_redirect_flow(self, client: TestClient):
        """REQ-02: Verify redirection."""
        long_url = "https://www.redirect-me.com/target"
        create_resp = client.post("/api/shorten", json={"target_url": long_url})
        code = create_resp.json()["short_code"]
        
        redirect_resp = client.get(f"/{code}", follow_redirects=False)
        assert redirect_resp.status_code in (301, 302, 307, 308)
        assert redirect_resp.headers["location"] == long_url

    def test_invalid_url_rejection(self, client: TestClient):
        """REQ-04: Reject invalid URLs."""
        response = client.post("/api/shorten", json={"target_url": "not-a-url"})
        assert response.status_code in (400, 422)

    def test_non_existent_code_404(self, client: TestClient):
        """REQ-Critical: 404 for invalid code."""
        response = client.get("/ZZZZZZ") 
        assert response.status_code == 404

    def test_collision_resistance_bulk(self, client: TestClient):
        """REQ-Critical: Generate 100 codes, ensure uniqueness."""
        urls = [f"https://bulk.com/{i}" for i in range(100)]
        codes = set()
        for url in urls:
            resp = client.post("/api/shorten", json={"target_url": url})
            code = resp.json()["short_code"]
            assert code not in codes, f"Collision detected for code {code}"
            codes.add(code)

    def test_url_complexity(self, client: TestClient):
        """REQ-Critical: Unicode, special characters, fragments."""
        complex_url = "https://example.com/fübar?q=val#frag"
        normalized_url = "https://example.com/f%C3%BCbar?q=val#frag"
        
        resp = client.post("/api/shorten", json={"target_url": complex_url})
        assert resp.status_code == 200
        data = resp.json()
        code = data["short_code"]
        
        get_resp = client.get(f"/api/url/{code}")
        assert get_resp.status_code == 200
        assert get_resp.json()["target_url"] == normalized_url
        
        redir_resp = client.get(f"/{code}", follow_redirects=False)
        assert redir_resp.status_code in (301, 302, 307, 308)
        assert redir_resp.headers["location"] == normalized_url

    def test_ui_render(self, client: TestClient):
        """REQ-03: Verify minimal web UI rendering."""
        response = client.get("/")
        assert response.status_code == 200
        assert "URL Shortener" in response.text
        assert "<form" in response.text
        assert 'name="target_url"' in response.text

    def test_ui_submission(self, client: TestClient):
        """REQ-03: Verify UI form submission."""
        long_url = "https://ui-test.com/home"
        response = client.post("/shorten-ui", data={"target_url": long_url})
        assert response.status_code == 200
        assert "Success!" in response.text
        assert long_url in response.text
        assert "href=" in response.text
