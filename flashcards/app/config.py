import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    google_api_key: str = os.getenv("GOOGLE_API_KEY")
    model_name: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash-latest")
    max_context_chars: int = 180_000  # soft cap for prompt size

settings = Settings()
