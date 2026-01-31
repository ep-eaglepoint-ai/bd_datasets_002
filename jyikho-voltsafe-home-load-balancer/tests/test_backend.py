"""
Comprehensive test suite for VoltSafe Home Load Balancer Backend.
Tests all 6 requirements specified in the task.
"""
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
import sys
import os

# Add backend to path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'repository_after', 'backend')
sys.path.insert(0, backend_path)

from main import app, MAX_LOAD_WATTS


# =============================================================================
# Requirement 1: Atomic Capacity Validation Tests
# =============================================================================
class TestAtomicCapacityValidation:
    """
    Requirement 1: Atomic Capacity Validation
    The FastAPI backend must use a database transaction or a thread-safe locking 
    mechanism to calculate the sum of active device wattages and validate the 
    5000W threshold.
    """
    
    @pytest.mark.asyncio
    async def test_capacity_validation_rejects_over_limit(self, client):
        """Test that requests exceeding 5000W are rejected."""
        # Create a 3000W appliance
        response = await client.post("/api/appliances", json={
            "name": "High Power Device 1",
            "wattage": 3000.0
        })
        assert response.status_code == 201
        device1_id = response.json()["id"]
        
        # Create another 3000W appliance
        response = await client.post("/api/appliances", json={
            "name": "High Power Device 2",
            "wattage": 3000.0
        })
        assert response.status_code == 201
        device2_id = response.json()["id"]
        
        # Turn on first device
        response = await client.post(f"/api/appliances/{device1_id}/toggle", json={"is_on": True})
        assert response.status_code == 200
        
        # Attempt to turn on second device (would exceed 5000W)
        response = await client.post(f"/api/appliances/{device2_id}/toggle", json={"is_on": True})
        assert response.status_code == 403
        
    @pytest.mark.asyncio
    async def test_capacity_allows_under_limit(self, client):
        """Test that requests under 5000W are allowed."""
        # Create two 2000W appliances
        response = await client.post("/api/appliances", json={
            "name": "Device 1",
            "wattage": 2000.0
        })
        device1_id = response.json()["id"]
        
        response = await client.post("/api/appliances", json={
            "name": "Device 2",
            "wattage": 2000.0
        })
        device2_id = response.json()["id"]
        
        # Turn on both (total 4000W < 5000W)
        response = await client.post(f"/api/appliances/{device1_id}/toggle", json={"is_on": True})
        assert response.status_code == 200
        
        response = await client.post(f"/api/appliances/{device2_id}/toggle", json={"is_on": True})
        assert response.status_code == 200
        
        # Verify load status
        response = await client.get("/api/load-status")
        assert response.json()["current_load"] == 4000.0

    @pytest.mark.asyncio
    async def test_turn_off_always_allowed(self, client):
        """Test that turning off devices is always allowed."""
        response = await client.post("/api/appliances", json={
            "name": "Device",
            "wattage": 3000.0
        })
        device_id = response.json()["id"]
        
        await client.post(f"/api/appliances/{device_id}/toggle", json={"is_on": True})
        
        response = await client.post(f"/api/appliances/{device_id}/toggle", json={"is_on": False})
        assert response.status_code == 200
        assert response.json()["appliance"]["is_on"] == False

    @pytest.mark.asyncio
    async def test_exact_5000w_allowed(self, client):
        """Test that exactly 5000W is allowed."""
        response = await client.post("/api/appliances", json={
            "name": "Device 1",
            "wattage": 2500.0
        })
        device1_id = response.json()["id"]
        
        response = await client.post("/api/appliances", json={
            "name": "Device 2",
            "wattage": 2500.0
        })
        device2_id = response.json()["id"]
        
        await client.post(f"/api/appliances/{device1_id}/toggle", json={"is_on": True})
        response = await client.post(f"/api/appliances/{device2_id}/toggle", json={"is_on": True})
        
        assert response.status_code == 200
        
        response = await client.get("/api/load-status")
        assert response.json()["current_load"] == 5000.0


# =============================================================================
# Requirement 2: Reactive Load Visualization Tests
# =============================================================================
class TestReactiveLoadVisualization:
    """
    Requirement 2: Reactive Load Visualization
    The Vue.js frontend must implement a reactive 'Current Consumption' meter 
    that updates immediately upon any device state change.
    """
    
    @pytest.mark.asyncio
    async def test_load_status_returns_current_load(self, client):
        """Test that load status endpoint returns accurate current load."""
        response = await client.post("/api/appliances", json={
            "name": "Test Device",
            "wattage": 1500.0
        })
        device_id = response.json()["id"]
        
        await client.post(f"/api/appliances/{device_id}/toggle", json={"is_on": True})
        
        response = await client.get("/api/load-status")
        data = response.json()
        
        assert data["current_load"] == 1500.0
        assert data["max_load"] == 5000.0
        assert data["available_capacity"] == 3500.0
        assert data["utilization_percent"] == 30.0
        
    @pytest.mark.asyncio
    async def test_load_status_safe_state(self, client):
        """Test safe status when utilization is low."""
        response = await client.get("/api/load-status")
        data = response.json()
        
        assert data["status"] == "safe"
        assert data["utilization_percent"] < 70
        
    @pytest.mark.asyncio
    async def test_load_status_warning_state(self, client):
        """Test warning status when utilization is 70-90%."""
        response = await client.post("/api/appliances", json={
            "name": "Device 1",
            "wattage": 2500.0
        })
        device1_id = response.json()["id"]
        
        response = await client.post("/api/appliances", json={
            "name": "Device 2",
            "wattage": 1250.0
        })
        device2_id = response.json()["id"]
        
        await client.post(f"/api/appliances/{device1_id}/toggle", json={"is_on": True})
        await client.post(f"/api/appliances/{device2_id}/toggle", json={"is_on": True})
        
        response = await client.get("/api/load-status")
        data = response.json()
        
        assert data["status"] == "warning"
        assert 70 <= data["utilization_percent"] < 90
        
    @pytest.mark.asyncio
    async def test_load_status_critical_state(self, client):
        """Test critical status when utilization is >= 90%."""
        response = await client.post("/api/appliances", json={
            "name": "Device 1",
            "wattage": 2500.0
        })
        device1_id = response.json()["id"]
        
        response = await client.post("/api/appliances", json={
            "name": "Device 2",
            "wattage": 2100.0
        })
        device2_id = response.json()["id"]
        
        await client.post(f"/api/appliances/{device1_id}/toggle", json={"is_on": True})
        await client.post(f"/api/appliances/{device2_id}/toggle", json={"is_on": True})
        
        response = await client.get("/api/load-status")
        data = response.json()
        
        assert data["status"] == "critical"
        assert data["utilization_percent"] >= 90

    @pytest.mark.asyncio
    async def test_toggle_response_includes_current_load(self, client):
        """Test that toggle response includes updated total load."""
        response = await client.post("/api/appliances", json={
            "name": "Test Device",
            "wattage": 1500.0
        })
        device_id = response.json()["id"]
        
        response = await client.post(f"/api/appliances/{device_id}/toggle", json={"is_on": True})
        data = response.json()
        
        assert "current_total_load" in data
        assert data["current_total_load"] == 1500.0


# =============================================================================
# Requirement 3: Idempotent State Transitions Tests
# =============================================================================
class TestIdempotentStateTransitions:
    """
    Requirement 3: Idempotent State Transitions
    Sending multiple 'ON' signals for an already active device should not result 
    in multiple wattage additions or state corruption.
    """
    
    @pytest.mark.asyncio
    async def test_multiple_on_signals_idempotent(self, client):
        """Test that multiple ON requests for same device don't add extra wattage."""
        response = await client.post("/api/appliances", json={
            "name": "Test Device",
            "wattage": 1500.0
        })
        device_id = response.json()["id"]
        
        await client.post(f"/api/appliances/{device_id}/toggle", json={"is_on": True})
        
        for _ in range(5):
            response = await client.post(f"/api/appliances/{device_id}/toggle", json={"is_on": True})
            assert response.status_code == 200
        
        response = await client.get("/api/load-status")
        assert response.json()["current_load"] == 1500.0
        
    @pytest.mark.asyncio
    async def test_multiple_off_signals_idempotent(self, client):
        """Test that multiple OFF requests don't cause issues."""
        response = await client.post("/api/appliances", json={
            "name": "Test Device",
            "wattage": 1500.0
        })
        device_id = response.json()["id"]
        
        await client.post(f"/api/appliances/{device_id}/toggle", json={"is_on": True})
        await client.post(f"/api/appliances/{device_id}/toggle", json={"is_on": False})
        
        for _ in range(5):
            response = await client.post(f"/api/appliances/{device_id}/toggle", json={"is_on": False})
            assert response.status_code == 200
            
        response = await client.get(f"/api/appliances/{device_id}")
        assert response.json()["is_on"] == False
        
    @pytest.mark.asyncio
    async def test_idempotent_returns_success_for_same_state(self, client):
        """Test that idempotent request returns success message."""
        response = await client.post("/api/appliances", json={
            "name": "Test Device",
            "wattage": 1500.0
        })
        device_id = response.json()["id"]
        
        await client.post(f"/api/appliances/{device_id}/toggle", json={"is_on": True})
        
        response = await client.post(f"/api/appliances/{device_id}/toggle", json={"is_on": True})
        data = response.json()
        
        assert data["success"] == True
        assert "already" in data["message"].lower()


# =============================================================================
# Requirement 4: Persistence Integrity Tests
# =============================================================================
class TestPersistenceIntegrity:
    """
    Requirement 4: Persistence Integrity
    All state changes are committed to a database before the API returns a 
    success status to the client.
    """
    
    @pytest.mark.asyncio
    async def test_appliance_created_with_correct_schema(self, client):
        """Test appliance is created with id, name, wattage, is_on fields."""
        response = await client.post("/api/appliances", json={
            "name": "Test Appliance",
            "wattage": 1500.0
        })
        
        assert response.status_code == 201
        data = response.json()
        
        assert "id" in data
        assert data["name"] == "Test Appliance"
        assert data["wattage"] == 1500.0
        assert data["is_on"] == False
        
    @pytest.mark.asyncio
    async def test_state_persists_after_toggle(self, client):
        """Test that toggle state persists in database."""
        response = await client.post("/api/appliances", json={
            "name": "Persistent Device",
            "wattage": 1500.0
        })
        device_id = response.json()["id"]
        
        await client.post(f"/api/appliances/{device_id}/toggle", json={"is_on": True})
        
        response = await client.get(f"/api/appliances/{device_id}")
        assert response.json()["is_on"] == True
        
    @pytest.mark.asyncio
    async def test_all_appliances_retrieved(self, client):
        """Test that all created appliances can be retrieved."""
        for i in range(3):
            await client.post("/api/appliances", json={
                "name": f"Device {i}",
                "wattage": 1000.0
            })
        
        response = await client.get("/api/appliances")
        assert response.status_code == 200
        assert len(response.json()) >= 3
        
    @pytest.mark.asyncio
    async def test_appliance_update_persists(self, client):
        """Test that appliance updates persist."""
        response = await client.post("/api/appliances", json={
            "name": "Original Name",
            "wattage": 1500.0
        })
        device_id = response.json()["id"]
        
        response = await client.put(f"/api/appliances/{device_id}", json={
            "name": "Updated Name",
            "wattage": 2000.0
        })
        assert response.status_code == 200
        
        response = await client.get(f"/api/appliances/{device_id}")
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["wattage"] == 2000.0

    @pytest.mark.asyncio
    async def test_appliance_delete(self, client):
        """Test that deleted appliance is removed."""
        response = await client.post("/api/appliances", json={
            "name": "To Delete",
            "wattage": 1000.0
        })
        device_id = response.json()["id"]
        
        response = await client.delete(f"/api/appliances/{device_id}")
        assert response.status_code == 204
        
        response = await client.get(f"/api/appliances/{device_id}")
        assert response.status_code == 404


# =============================================================================
# Requirement 5: Collision Testing (50 Concurrent Requests)
# =============================================================================
class TestCollisionHandling:
    """
    Requirement 5: Testing Requirement (Collision)
    Simulate 50 concurrent requests to activate a 3000W device in a system 
    with 3000W already utilized. Verify that the final total load remains 
    at 3000W and all 50 new requests return a 403 Forbidden or 400 Bad Request.
    """
    
    @pytest.mark.asyncio
    async def test_50_concurrent_requests_all_rejected(self, client):
        """
        Test 50 concurrent requests to activate 3000W device when 
        system already has 3000W utilized.
        """
        # Create base load device (3000W)
        response = await client.post("/api/appliances", json={
            "name": "Base Load Device",
            "wattage": 3000.0
        })
        base_device_id = response.json()["id"]
        
        # Turn on base device
        response = await client.post(
            f"/api/appliances/{base_device_id}/toggle", 
            json={"is_on": True}
        )
        assert response.status_code == 200
        
        # Verify base load
        response = await client.get("/api/load-status")
        assert response.json()["current_load"] == 3000.0
        
        # Create the device we'll try to turn on concurrently
        response = await client.post("/api/appliances", json={
            "name": "Concurrent Test Device",
            "wattage": 3000.0
        })
        test_device_id = response.json()["id"]
        
        # Create 50 concurrent requests
        async def make_request():
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                return await ac.post(
                    f"/api/appliances/{test_device_id}/toggle",
                    json={"is_on": True}
                )
        
        # Execute all requests concurrently
        tasks = [make_request() for _ in range(50)]
        responses = await asyncio.gather(*tasks)
        
        # Count responses
        success_count = sum(1 for r in responses if r.status_code == 200)
        rejected_count = sum(1 for r in responses if r.status_code in [400, 403])
        
        # All should be rejected
        assert success_count == 0, f"Expected 0 successes, got {success_count}"
        assert rejected_count == 50, f"Expected 50 rejections, got {rejected_count}"
        
        # Verify final load is still 3000W
        response = await client.get("/api/load-status")
        final_load = response.json()["current_load"]
        assert final_load == 3000.0, f"Expected 3000W, got {final_load}W"

    @pytest.mark.asyncio
    async def test_concurrent_toggle_race_condition_prevented(self, client):
        """Test that race conditions are prevented with concurrent toggles."""
        response = await client.post("/api/appliances", json={
            "name": "Device A",
            "wattage": 3000.0
        })
        device_a_id = response.json()["id"]
        
        response = await client.post("/api/appliances", json={
            "name": "Device B",
            "wattage": 3000.0
        })
        device_b_id = response.json()["id"]
        
        async def toggle_device(device_id):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                return await ac.post(
                    f"/api/appliances/{device_id}/toggle",
                    json={"is_on": True}
                )
        
        results = await asyncio.gather(
            toggle_device(device_a_id),
            toggle_device(device_b_id)
        )
        
        success_count = sum(1 for r in results if r.status_code == 200)
        
        # Only one should succeed
        assert success_count == 1, f"Expected exactly 1 success, got {success_count}"
        
        # Verify final load is exactly 3000W
        response = await client.get("/api/load-status")
        assert response.json()["current_load"] == 3000.0


# =============================================================================
# Requirement 6: Precision Testing (Fractional Wattage)
# =============================================================================
class TestPrecisionCalculation:
    """
    Requirement 6: Testing Requirement (Precision)
    Verify that the system accurately calculates fractional wattage 
    (e.g., 2500.5W + 2499.6W = 5000.1W) and rejects the transition 
    even if it exceeds the limit by a single decimal point.
    """
    
    @pytest.mark.asyncio
    async def test_fractional_wattage_calculation_exact_limit(self, client):
        """Test that 2500.0W + 2500.0W = 5000.0W is allowed."""
        response = await client.post("/api/appliances", json={
            "name": "Precise Device 1",
            "wattage": 2500.0
        })
        device1_id = response.json()["id"]
        
        response = await client.post("/api/appliances", json={
            "name": "Precise Device 2",
            "wattage": 2500.0
        })
        device2_id = response.json()["id"]
        
        response = await client.post(f"/api/appliances/{device1_id}/toggle", json={"is_on": True})
        assert response.status_code == 200
        
        response = await client.post(f"/api/appliances/{device2_id}/toggle", json={"is_on": True})
        assert response.status_code == 200
        
        response = await client.get("/api/load-status")
        assert response.json()["current_load"] == 5000.0
        
    @pytest.mark.asyncio
    async def test_fractional_wattage_exceeds_by_decimal(self, client):
        """Test that 2500.5W + 2499.6W = 5000.1W is rejected."""
        response = await client.post("/api/appliances", json={
            "name": "Precise Device 1",
            "wattage": 2500.5
        })
        device1_id = response.json()["id"]
        
        response = await client.post("/api/appliances", json={
            "name": "Precise Device 2",
            "wattage": 2499.6
        })
        device2_id = response.json()["id"]
        
        response = await client.post(f"/api/appliances/{device1_id}/toggle", json={"is_on": True})
        assert response.status_code == 200
        
        response = await client.post(f"/api/appliances/{device2_id}/toggle", json={"is_on": True})
        assert response.status_code == 403
        
        response = await client.get("/api/load-status")
        assert response.json()["current_load"] == 2500.5
        
    @pytest.mark.asyncio
    async def test_fractional_wattage_exceeds_by_0_1(self, client):
        """Test that exceeding by 0.1W is rejected."""
        response = await client.post("/api/appliances", json={
            "name": "Device 1",
            "wattage": 2500.0
        })
        device1_id = response.json()["id"]
        
        response = await client.post("/api/appliances", json={
            "name": "Device 2",
            "wattage": 2500.1
        })
        device2_id = response.json()["id"]
        
        await client.post(f"/api/appliances/{device1_id}/toggle", json={"is_on": True})
        
        response = await client.post(f"/api/appliances/{device2_id}/toggle", json={"is_on": True})
        assert response.status_code == 403
        
    @pytest.mark.asyncio
    async def test_fractional_wattage_exactly_at_limit(self, client):
        """Test that exactly 5000.0W is allowed with fractional values."""
        response = await client.post("/api/appliances", json={
            "name": "Device 1",
            "wattage": 2499.5
        })
        device1_id = response.json()["id"]
        
        response = await client.post("/api/appliances", json={
            "name": "Device 2",
            "wattage": 2500.5
        })
        device2_id = response.json()["id"]
        
        response = await client.post(f"/api/appliances/{device1_id}/toggle", json={"is_on": True})
        assert response.status_code == 200
        
        response = await client.post(f"/api/appliances/{device2_id}/toggle", json={"is_on": True})
        assert response.status_code == 200
        
        response = await client.get("/api/load-status")
        assert response.json()["current_load"] == 5000.0

    @pytest.mark.asyncio
    async def test_precision_error_message_includes_exceeded_amount(self, client):
        """Test that error message shows how much limit was exceeded by."""
        response = await client.post("/api/appliances", json={
            "name": "Device 1",
            "wattage": 4000.0
        })
        device1_id = response.json()["id"]
        
        response = await client.post("/api/appliances", json={
            "name": "Device 2",
            "wattage": 1500.5
        })
        device2_id = response.json()["id"]
        
        await client.post(f"/api/appliances/{device1_id}/toggle", json={"is_on": True})
        
        response = await client.post(f"/api/appliances/{device2_id}/toggle", json={"is_on": True})
        assert response.status_code == 403
        
        error_detail = response.json()["detail"]
        assert "exceeded_by" in error_detail
        assert error_detail["exceeded_by"] == 500.5


# =============================================================================
# Additional API Tests
# =============================================================================
class TestAPIEndpoints:
    """Additional API endpoint tests."""
    
    @pytest.mark.asyncio
    async def test_health_check(self, client):
        """Test health check endpoint."""
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["max_load"] == 5000.0
        
    @pytest.mark.asyncio
    async def test_get_nonexistent_appliance_returns_404(self, client):
        """Test that getting non-existent appliance returns 404."""
        response = await client.get("/api/appliances/99999")
        assert response.status_code == 404
        
    @pytest.mark.asyncio
    async def test_toggle_nonexistent_appliance_returns_404(self, client):
        """Test that toggling non-existent appliance returns 404."""
        response = await client.post("/api/appliances/99999/toggle", json={"is_on": True})
        assert response.status_code == 404
        
    @pytest.mark.asyncio
    async def test_create_appliance_with_invalid_wattage_rejected(self, client):
        """Test that creating appliance with 0 or negative wattage is rejected."""
        response = await client.post("/api/appliances", json={
            "name": "Invalid Device",
            "wattage": 0
        })
        assert response.status_code == 422
        
        response = await client.post("/api/appliances", json={
            "name": "Invalid Device",
            "wattage": -100
        })
        assert response.status_code == 422