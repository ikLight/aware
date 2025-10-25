import os
from datetime import datetime
import uuid

from passlib.context import CryptContext
from jose import jwt, JWTError

from fastapi import HTTPException, status
from fastapi import Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from pydantic import BaseModel

from .database.operations import AtomicDB, QueryDB

# create single instances that will be used by the auth module
_atomic_db = AtomicDB()
_query_db = QueryDB()

# Configuration (can be overridden with environment variables)
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "aware")
SECRET_KEY = os.getenv("JWT_SECRET", "test")
ALGORITHM = "HS256"


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

##-----------------------------------------------------------##

class UserCreate(BaseModel):
    username: str
    password: str
    role: str  # 'student' or 'professor'

##-----------------------------------------------------------##

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

##-----------------------------------------------------------##

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

##-----------------------------------------------------------##

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

##-----------------------------------------------------------##

def create_user(username: str, password: str, role: str) -> dict:
    existing = _query_db.find_user(username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed = hash_password(password)
    user = {
        "username": username,
        "password": hashed,
        "role": role,
        "created_at": datetime.utcnow()
    }
    _atomic_db.insert_user(user)
    user.pop("password", None)
    return user

##-----------------------------------------------------------##

def authenticate_user(username: str, password: str) -> dict | None:
    user = _query_db.find_user(username)
    if not user:
        return None
    if not verify_password(password, user.get("password", "")):
        return None
    user.pop("password", None)
    return user

##-----------------------------------------------------------##

def create_access_token(data: dict) -> str:
    """Create a JWT without expiration and persist its jti in DB.

    Note: This intentionally does not set an "exp" claim for MVP. The token's
    jti is stored in the `tokens` collection so logout can remove it.
    """
    username = data.get("username")
    # Check if user already has a token
    existing_token = _query_db.db.tokens.find_one({"username": username})
    if existing_token:
        raise HTTPException(status_code=400, detail="User is already logged in. Please logout first.")

    to_encode = data.copy()
    jti = str(uuid.uuid4())
    to_encode.update({"jti": jti})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    token_doc = {
        "jti": jti,
        "username": username,
        "created_at": datetime.utcnow(),
        "token": encoded_jwt,
    }
    try:
        _atomic_db.insert_token(token_doc)
    except Exception:
        pass
    return encoded_jwt

##-----------------------------------------------------------##

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("username")
        jti: str = payload.get("jti")
        if username is None or jti is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    # check token exists in DB (must be present to be valid)
    token_entry = _query_db.find_token_by_jti(jti)
    if not token_entry:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked or not found")

    user = _query_db.find_user_no_password(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

##-----------------------------------------------------------##

def logout_token(token: str) -> None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        if not jti:
            return
        # Check if token exists
        token_entry = _query_db.find_token_by_jti(jti)
        if not token_entry:
            raise HTTPException(status_code=400, detail="User already logged out.")
        # delete the token document for this jti
        _atomic_db.delete_token_by_jti(jti)
    except JWTError:
        # invalid token; nothing to do
        return

##-----------------------------------------------------------##
