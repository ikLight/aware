"""Application configuration settings."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings and configuration."""
    
    # API Configuration
    TITLE: str = "Course Personalization API"
    VERSION: str = "1.0.0"
    
    # Gemini AI Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"
    GEMINI_MODEL_TEST: str = "models/gemini-2.5-flash"
    
    # Database Configuration
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "course_db")
    
    # File Upload Configuration
    UPLOAD_DIR: Path = Path("uploads")
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS: set = {".pdf", ".pptx", ".ppt", ".docx", ".txt"}
    
    # CORS Configuration
    CORS_ORIGINS: list = ["*"]
    CORS_CREDENTIALS: bool = False
    CORS_METHODS: list = ["*"]
    CORS_HEADERS: list = ["*"]
    
    # JWT Configuration
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Test Generation Configuration
    DEFAULT_NUM_QUESTIONS: int = 10
    PROFICIENCY_LEVELS: list = ["beginner", "intermediate", "advanced"]
    
    # Analytics Configuration
    DEFAULT_PROFICIENCY: str = "intermediate"
    RECENT_TESTS_LIMIT: int = 5
    
    @classmethod
    def validate(cls) -> None:
        """Validate required settings."""
        if not cls.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY environment variable is required")
    
    @classmethod
    def ensure_directories(cls) -> None:
        """Ensure required directories exist."""
        cls.UPLOAD_DIR.mkdir(exist_ok=True)


# Create settings instance
settings = Settings()
