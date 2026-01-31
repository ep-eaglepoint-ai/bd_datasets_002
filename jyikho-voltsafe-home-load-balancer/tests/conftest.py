"""Test fixtures and configuration."""
import pytest
import asyncio
import sys
import os

# Add backend to path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'repository_after', 'backend')
sys.path.insert(0, backend_path)

from httpx import AsyncClient, ASGITransport
from main import app
from database import Base, engine, AsyncSessionLocal
from models import Appliance


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def reset_database():
    """Reset database before each test."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.fixture
async def db_session():
    """Get database session for tests."""
    async with AsyncSessionLocal() as session:
        yield session


@pytest.fixture
async def client():
    """Create test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def seeded_client(client):
    """Client with pre-seeded appliances."""
    appliances = [
        {"name": "Test Heater", "wattage": 1500.0},
        {"name": "Test EV Charger", "wattage": 3000.0},
        {"name": "Test Oven", "wattage": 2000.0},
    ]
    for app_data in appliances:
        await client.post("/api/appliances", json=app_data)
    yield client