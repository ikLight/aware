"""Application configuration settings."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings and configuration."""
    
    # API Info
    TITLE: str = "Course Personalization API"
    VERSION: str = "1.0.0"

    # ================================
    # Gemini AI Configuration (FIXED)
    # ================================
    # Your .env MUST contain:
    # GEMINI_API_KEY=AIxxxxxx...
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Use real existing Gemini models ONLY
    GEMINI_MODEL: str = "gemini-2.0-flash"        # for flashcards, mapping
    GEMINI_MODEL_TEST: str = "gemini-2.0-flash"   # for test generation

    # If you want strongest reasoning:
    # GEMINI_MODEL_TEST: str = "gemini-2.0-pro"

    # ================================
    # OpenAI (optional)
    # ================================
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # ================================
    # Database Configuration
    # ================================
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "course_db")

    # ================================
    # File Upload Settings
    # ================================
    UPLOAD_DIR: Path = Path("uploads")
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS: set = {".pdf", ".pptx", ".ppt", ".docx", ".txt"}

    # ================================
    # CORS Configuration
    # ================================
    CORS_ORIGINS: list = ["*"]
    CORS_CREDENTIALS: bool = False
    CORS_METHODS: list = ["*"]
    CORS_HEADERS: list = ["*"]

    # ================================
    # JWT Config
    # ================================
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # ================================
    # Test Generation Defaults
    # ================================
    DEFAULT_NUM_QUESTIONS: int = 10
    PROFICIENCY_LEVELS: list = ["beginner", "intermediate", "advanced"]

    # ================================
    # Analytics
    # ================================
    DEFAULT_PROFICIENCY: str = "intermediate"
    RECENT_TESTS_LIMIT: int = 5

    # ================================
    # Validators
    # ================================
    @classmethod
    def validate(cls) -> None:
        """Validate required settings."""
        if not cls.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY environment variable is required")

    @classmethod
    def ensure_directories(cls) -> None:
        """Ensure required directories exist."""
        cls.UPLOAD_DIR.mkdir(exist_ok=True)


# Instantiate settings
settings = Settings()
