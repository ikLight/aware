import pytest
from fastapi.testclient import TestClient
from app.app import app
from pathlib import Path
import os

client = TestClient(app)

@pytest.fixture
def test_user_token():
    # Create a test user and get token
    user_data = {"username": "testuser", "password": "testpass123"}
    client.post("/auth/register", json=user_data)
    response = client.post("/auth/login", json=user_data)
    return response.json()["access_token"]

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_register_user():
    response = client.post(
        "/auth/register",
        json={"username": "newuser", "password": "password123"}
    )
    assert response.status_code == 201
    data = response.json()
    assert "username" in data
    assert data["username"] == "newuser"

def test_login_user():
    # First register a user
    client.post(
        "/auth/register",
        json={"username": "loginuser", "password": "password123"}
    )
    
    # Then try to login
    response = client.post(
        "/auth/login",
        json={"username": "loginuser", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

def test_protected_routes(test_user_token):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    # Test file upload
    test_file_content = b"test content"
    files = {"files": ("test.txt", test_file_content)}
    response = client.post("/upload", headers=headers, files=files)
    assert response.status_code == 200
    data = response.json()
    assert "paths" in data
    assert len(data["paths"]) == 1

def test_invalid_login():
    response = client.post(
        "/auth/login",
        json={"username": "nonexistent", "password": "wrong"}
    )
    assert response.status_code == 401

def test_upload_without_auth():
    files = {"files": ("test.txt", b"test content")}
    response = client.post("/upload", files=files)
    assert response.status_code == 401  # Unauthorized

def test_logout(test_user_token):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    response = client.post("/auth/logout", headers=headers)
    assert response.status_code == 200
    
    # Try to use the same token after logout
    response = client.post("/upload", headers=headers, files={"files": ("test.txt", b"test")})
    assert response.status_code == 401  # Should be unauthorized

# Cleanup function to remove test files after tests
@pytest.fixture(autouse=True)
def cleanup():
    yield
    # Clean up uploaded test files
    upload_dir = Path("uploads")
    if upload_dir.exists():
        for file in upload_dir.glob("test.txt"):
            file.unlink()