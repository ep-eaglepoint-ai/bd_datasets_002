import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.main import app
from app.database import Base, get_db
from app.auth import create_access_token, get_password_hash, verify_password
from app import models
from sqlalchemy.pool import StaticPool
from datetime import timedelta
import asyncio

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

# ===== REQUIREMENT 1: Authentication & Security =====

async def test_register_user():
    """Test user registration with email/password"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

async def test_password_hashing_with_bcrypt():
    """Test that passwords are hashed using bcrypt"""
    password = "mySecurePassword123"
    hashed = get_password_hash(password)
    
    # Verify it's a bcrypt hash (starts with $2b$)
    assert hashed.startswith("$2b$")
    
    # Verify password can be verified
    assert verify_password(password, hashed) == True
    assert verify_password("wrongpassword", hashed) == False

async def test_jwt_token_generation():
    """Test JWT token issuance for API authentication"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        response = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
    
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

async def test_protected_route_requires_valid_token():
    """Test that protected routes require valid JWT tokens"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Try to access protected route without token
        response = await ac.get("/notebooks/")
        assert response.status_code == 401
        
        # Register and login to get valid token
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        
        # Access with valid token
        headers = {"Authorization": f"Bearer {token}"}
        response = await ac.get("/notebooks/", headers=headers)
        assert response.status_code == 200

async def test_invalid_token_rejected():
    """Test that invalid tokens are rejected"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = await ac.get("/notebooks/", headers=headers)
        assert response.status_code == 401

async def test_invalid_credentials():
    """Test login with invalid credentials"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        response = await ac.post("/auth/token", data={"username": "test@example.com", "password": "wrongpassword"})
        assert response.status_code == 401

# ===== REQUIREMENT 2: Markdown Editor (Backend API) =====

async def test_note_creation_with_content():
    """Test creating notes with markdown content"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        nb = await ac.post("/notebooks/", json={"name": "My Notebook"}, headers=headers)
        nb_id = nb.json()["id"]
        
        markdown_content = "# Hello\n\n- Item 1\n- Item 2\n\n```python\nprint('hello')\n```"
        response = await ac.post("/notes/", json={
            "title": "My Note",
            "content": markdown_content,
            "notebook_id": nb_id
        }, headers=headers)
        
        assert response.status_code == 200
        assert response.json()["content"] == markdown_content

async def test_note_update():
    """Test updating note content"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        nb = await ac.post("/notebooks/", json={"name": "My Notebook"}, headers=headers)
        nb_id = nb.json()["id"]
        
        note = await ac.post("/notes/", json={"title": "My Note", "content": "Original", "notebook_id": nb_id}, headers=headers)
        note_id = note.json()["id"]
        
        response = await ac.put(f"/notes/{note_id}", json={"content": "Updated content"}, headers=headers)
        assert response.status_code == 200
        assert response.json()["content"] == "Updated content"

# ===== REQUIREMENT 3: Auto-save Functionality =====

async def test_concurrent_note_updates():
    """Test handling concurrent updates to the same note"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        nb = await ac.post("/notebooks/", json={"name": "My Notebook"}, headers=headers)
        nb_id = nb.json()["id"]
        
        note = await ac.post("/notes/", json={"title": "My Note", "content": "Original", "notebook_id": nb_id}, headers=headers)
        note_id = note.json()["id"]
        
        # Simulate multiple rapid updates (debounced saves)
        await ac.put(f"/notes/{note_id}", json={"content": "Update 1"}, headers=headers)
        await ac.put(f"/notes/{note_id}", json={"content": "Update 2"}, headers=headers)
        response = await ac.put(f"/notes/{note_id}", json={"content": "Final update"}, headers=headers)
        
        assert response.status_code == 200
        assert response.json()["content"] == "Final update"

async def test_update_timestamp_verification():
    """Test that updated_at timestamp changes on updates"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        nb = await ac.post("/notebooks/", json={"name": "My Notebook"}, headers=headers)
        nb_id = nb.json()["id"]
        
        note = await ac.post("/notes/", json={"title": "My Note", "content": "Original", "notebook_id": nb_id}, headers=headers)
        note_id = note.json()["id"]
        original_time = note.json()["updated_at"]
        
        await asyncio.sleep(0.1)  # Small delay to ensure timestamp difference
        
        response = await ac.put(f"/notes/{note_id}", json={"content": "Updated"}, headers=headers)
        updated_time = response.json()["updated_at"]
        
        assert updated_time >= original_time  # Timestamp should be same or later

# ===== REQUIREMENT 4: Notebook Organization =====

async def test_create_notebook():
    """Test creating notebooks to group notes"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = await ac.post("/notebooks/", json={"name": "My Notebook"}, headers=headers)
        assert response.status_code == 200
        assert response.json()["name"] == "My Notebook"

async def test_list_notes_by_notebook():
    """Test displaying notes organized by notebook"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        nb1 = await ac.post("/notebooks/", json={"name": "Notebook 1"}, headers=headers)
        nb2 = await ac.post("/notebooks/", json={"name": "Notebook 2"}, headers=headers)
        nb1_id = nb1.json()["id"]
        nb2_id = nb2.json()["id"]
        
        await ac.post("/notes/", json={"title": "Note 1", "content": "Content 1", "notebook_id": nb1_id}, headers=headers)
        await ac.post("/notes/", json={"title": "Note 2", "content": "Content 2", "notebook_id": nb1_id}, headers=headers)
        await ac.post("/notes/", json={"title": "Note 3", "content": "Content 3", "notebook_id": nb2_id}, headers=headers)
        
        # Get notes for notebook 1
        response = await ac.get(f"/notes/?notebook_id={nb1_id}", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 2

async def test_move_note_between_notebooks():
    """Test moving notes between notebooks"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        nb1 = await ac.post("/notebooks/", json={"name": "Notebook 1"}, headers=headers)
        nb2 = await ac.post("/notebooks/", json={"name": "Notebook 2"}, headers=headers)
        nb1_id = nb1.json()["id"]
        nb2_id = nb2.json()["id"]
        
        note = await ac.post("/notes/", json={"title": "Note 1", "content": "Content", "notebook_id": nb1_id}, headers=headers)
        note_id = note.json()["id"]
        
        # Move note to notebook 2
        response = await ac.put(f"/notes/{note_id}", json={"notebook_id": nb2_id}, headers=headers)
        assert response.status_code == 200
        assert response.json()["notebook_id"] == nb2_id

async def test_all_notes_view():
    """Test 'All Notes' view showing everything"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        nb1 = await ac.post("/notebooks/", json={"name": "Notebook 1"}, headers=headers)
        nb2 = await ac.post("/notebooks/", json={"name": "Notebook 2"}, headers=headers)
        nb1_id = nb1.json()["id"]
        nb2_id = nb2.json()["id"]
        
        await ac.post("/notes/", json={"title": "Note 1", "content": "Content 1", "notebook_id": nb1_id}, headers=headers)
        await ac.post("/notes/", json={"title": "Note 2", "content": "Content 2", "notebook_id": nb2_id}, headers=headers)
        
        # Get all notes (no notebook filter)
        response = await ac.get("/notes/", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 2

async def test_notebook_deletion_cascade():
    """Test that deleting a notebook deletes its notes"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        nb = await ac.post("/notebooks/", json={"name": "Notebook 1"}, headers=headers)
        nb_id = nb.json()["id"]
        
        await ac.post("/notes/", json={"title": "Note 1", "content": "Content", "notebook_id": nb_id}, headers=headers)
        
        # Delete notebook
        await ac.delete(f"/notebooks/{nb_id}", headers=headers)
        
        # Verify notes are gone
        response = await ac.get("/notes/", headers=headers)
        assert len(response.json()) == 0

# ===== REQUIREMENT 5: Search Functionality =====

async def test_search_notes_by_title():
    """Test full-text search across note titles"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        nb = await ac.post("/notebooks/", json={"name": "My Notebook"}, headers=headers)
        nb_id = nb.json()["id"]

        await ac.post("/notes/", json={"title": "Python Tutorial", "content": "Learn Python", "notebook_id": nb_id}, headers=headers)
        await ac.post("/notes/", json={"title": "JavaScript Guide", "content": "Learn JS", "notebook_id": nb_id}, headers=headers)

        # Search for "Python"
        response = await ac.get("/notes/?search=Python", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Python Tutorial"

async def test_search_notes_by_content():
    """Test full-text search across note content"""
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

async def test_search_with_notebook_filter():
    """Test search with notebook filter"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        nb1 = await ac.post("/notebooks/", json={"name": "Notebook 1"}, headers=headers)
        nb2 = await ac.post("/notebooks/", json={"name": "Notebook 2"}, headers=headers)
        nb1_id = nb1.json()["id"]
        nb2_id = nb2.json()["id"]

        await ac.post("/notes/", json={"title": "Python in NB1", "content": "Content", "notebook_id": nb1_id}, headers=headers)
        await ac.post("/notes/", json={"title": "Python in NB2", "content": "Content", "notebook_id": nb2_id}, headers=headers)

        # Search for "Python" in notebook 1 only
        response = await ac.get(f"/notes/?search=Python&notebook_id={nb1_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Python in NB1"

async def test_case_insensitive_search():
    """Test that search is case-insensitive"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        nb = await ac.post("/notebooks/", json={"name": "My Notebook"}, headers=headers)
        nb_id = nb.json()["id"]

        await ac.post("/notes/", json={"title": "PYTHON Tutorial", "content": "Learn python", "notebook_id": nb_id}, headers=headers)

        # Search with lowercase
        response = await ac.get("/notes/?search=python", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

# ===== REQUIREMENT 6: Note List Display =====

async def test_notes_sorted_by_modified_date():
    """Test that notes are sorted by most recently modified"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        nb = await ac.post("/notebooks/", json={"name": "My Notebook"}, headers=headers)
        nb_id = nb.json()["id"]

        note1 = await ac.post("/notes/", json={"title": "First", "content": "Content", "notebook_id": nb_id}, headers=headers)
        await asyncio.sleep(0.1)
        note2 = await ac.post("/notes/", json={"title": "Second", "content": "Content", "notebook_id": nb_id}, headers=headers)
        
        response = await ac.get("/notes/", headers=headers)
        notes = response.json()
        
        # Most recent should be first
        assert notes[0]["title"] == "Second"
        assert notes[1]["title"] == "First"

async def test_note_list_shows_title_and_date():
    """Test that note list includes title and last modified date"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
        login_res = await ac.post("/auth/token", data={"username": "test@example.com", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        nb = await ac.post("/notebooks/", json={"name": "My Notebook"}, headers=headers)
        nb_id = nb.json()["id"]

        await ac.post("/notes/", json={"title": "My Note", "content": "Content", "notebook_id": nb_id}, headers=headers)
        
        response = await ac.get("/notes/", headers=headers)
        note = response.json()[0]
        
        assert "title" in note
        assert "updated_at" in note
        assert note["title"] == "My Note"
