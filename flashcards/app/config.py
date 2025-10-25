import os
from pydantic import BaseModel

class Settings(BaseModel):
    google_api_key: str = os.getenv("GOOGLE_API_KEY", "AIzaSyBWl60BJK0n3EbOPCJQB4gvYL95cEkfaeU")
    model_name: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash-latest")
    max_context_chars: int = 180_000  # soft cap for prompt size

settings = Settings()
