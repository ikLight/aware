"""Authentication API router."""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any

from src.models.schemas import UserCreate, LoginRequest, Token, MessageResponse
from src.database.operations import AtomicDB, QueryDB
from src.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    get_current_user
)


router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

# Initialize database
atomic_db = AtomicDB()
query_db = QueryDB()


@router.post("/register")
def register(payload: UserCreate) -> MessageResponse:
    """Register a new user (professor or student)."""
    # Validate role
    if payload.role not in ["professor", "student"]:
        raise HTTPException(status_code=400, detail="Role must be 'professor' or 'student'")
    
    # Check if user already exists
    existing_user = query_db.find_user(payload.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Hash password
    hashed_pw = hash_password(payload.password)
    
    # Create user document
    user_doc = {
        "username": payload.username,
        "password": hashed_pw,
        "role": payload.role,
        "email": payload.email
    }
    
    # Insert user
    user_id = atomic_db.insert_user(user_doc)
    
    if not user_id:
        raise HTTPException(status_code=500, detail="Failed to create user")
    
    return MessageResponse(
        message=f"User '{payload.username}' registered successfully as {payload.role}"
    )


@router.post("/login")
def login(payload: LoginRequest) -> Token:
    """Login and receive JWT token."""
    # Find user
    user = query_db.find_user(payload.username)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(payload.password, user.get("password")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create JWT token
    token_data = {
        "username": user["username"],
        "role": user["role"]
    }
    access_token = create_access_token(token_data)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user["role"],
        username=user["username"]
    )


@router.get("/me")
def get_current_user_info(user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Get current user information from token."""
    # Find user in database to get full details
    user_data = query_db.find_user(user["username"])
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove password from response
    user_data.pop("password", None)
    
    # Serialize ObjectId
    if "_id" in user_data:
        user_data["_id"] = str(user_data["_id"])
    
    return user_data


@router.post("/logout")
def logout(credentials: HTTPAuthorizationCredentials = Depends(security)) -> MessageResponse:
    """Logout and revoke token."""
    from src.auth import logout_token
    
    token = credentials.credentials
    logout_token(token)
    
    return MessageResponse(message="Logged out successfully")


@router.post("/change-password")
def change_password(
    old_password: str,
    new_password: str,
    user: dict = Depends(get_current_user)
) -> MessageResponse:
    """Change user password."""
    # Find user
    user_data = query_db.find_user(user["username"])
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify old password
    if not verify_password(old_password, user_data.get("password")):
        raise HTTPException(status_code=401, detail="Invalid old password")
    
    # Hash new password
    hashed_pw = hash_password(new_password)
    
    # Update password
    success = atomic_db.update_user_password(user["username"], hashed_pw)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update password")
    
    return MessageResponse(message="Password changed successfully")
