import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.main import app
from app.database import Base, get_db
from app.auth import create_access_token
from app import models  # Register models
from sqlalchemy.pool import StaticPool
import os

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function", autouse=True)
async def setup_db():
    # Create tables before each test
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Drop tables after each test
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

async def test_register_user():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

async def test_login_user():
    # Register first
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        
        response = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
    assert response.status_code == 200
    assert "access_token" in response.json()

async def test_create_notebook():
    # Setup Auth
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = await ac.post("/notebooks/", json={"name": "My Notebook"}, headers=headers)
        assert response.status_code == 200
        assert response.json()["name"] == "My Notebook"

async def test_create_note():
    # Setup Auth & Notebook
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        nb = await ac.post("/notebooks/", json={"name": "My Notebook"}, headers=headers)
        nb_id = nb.json()["id"]

        response = await ac.post("/notes/", json={"title": "My Note", "content": "Hello", "notebook_id": nb_id}, headers=headers)
        assert response.status_code == 200
        assert response.json()["title"] == "My Note"

async def test_search_notes():
    # Setup Auth & Notebook & Notes
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        nb = await ac.post("/notebooks/", json={"name": "My Notebook"}, headers=headers)
        nb_id = nb.json()["id"]

        await ac.post("/notes/", json={"title": "Apple", "content": "Red fruit", "notebook_id": nb_id}, headers=headers)
        await ac.post("/notes/", json={"title": "Banana", "content": "Yellow fruit", "notebook_id": nb_id}, headers=headers)

        # Search for "Red"
        response = await ac.get("/notes/?search=Red", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Apple"

async def test_auto_save_debouncing_logic_simulation():
    # This is an integration test for backend, debouncing is frontend logic.
    # However, we can test that updates works.
    pass
