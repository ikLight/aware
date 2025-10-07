import os
from pydantic import BaseModel
import uvicorn

from fastapi.security import HTTPBearer

# shared security instance for extracting bearer credentials
security = HTTPBearer()

##-----------------------------------------------------------##

class CreateTestRequest(BaseModel):
    json_path: str
    course_material_json: str

##-----------------------------------------------------------##

class LoginRequest(BaseModel):
    username: str
    password: str

##-----------------------------------------------------------##

async def ensure_db_indexes():
    try:
        from src.database.init_db import ensure_indexes

        await ensure_indexes()
    except Exception:
        # best-effort
        pass

##-----------------------------------------------------------##

def run_uvicorn():
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

##-----------------------------------------------------------##
