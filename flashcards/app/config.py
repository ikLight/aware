import os
from pydantic import BaseModel

class Settings(BaseModel):
    google_api_key: str = os.getenv("GOOGLE_API_KEY", "AIzaSyBrJY7hXD90HOKHas7txAYQtapvyG_Ea6w")
    model_name: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash-latest")
    max_context_chars: int = 180_000  # soft cap for prompt size

settings = Settings()
