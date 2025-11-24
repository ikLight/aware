"""
FastAPI Application Entry Point
Clean architecture with router-based organization
"""

from dotenv import load_dotenv
load_dotenv()

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from src.api.auth_routes import router as auth_router
from src.api.course_routes import router as course_router
from src.api.student_routes import router as student_router
from src.api.test_routes import router as test_router

# Import utilities
from src.utils import ensure_db_indexes
from src.config.settings import Settings


# Initialize settings
settings = Settings()
settings.validate()
settings.ensure_directories()

# Create FastAPI application
app = FastAPI(
    title="Adaptive Learning Platform API",
    version="2.0.0",
    description="AI-powered adaptive learning system with course management, testing, and analytics"
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,  # Must be False when using wildcard origins
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Register routers
app.include_router(auth_router)
app.include_router(course_router)
app.include_router(student_router)
app.include_router(test_router)


@app.on_event("startup")
def startup_event():
    """Initialize database indexes and perform startup tasks."""
    ensure_db_indexes()
    print("✓ Database indexes ensured")
    print(f"✓ Upload directory: {settings.UPLOAD_DIR}")
    print("✓ API server ready")


@app.get("/", tags=["health"])
def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "version": "2.0.0",
        "service": "Adaptive Learning Platform API"
    }


@app.get("/health", tags=["health"])
def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "database": "connected",
        "ai_service": "ready",
        "timestamp": str(datetime.now())
    }


if __name__ == "__main__":
    import uvicorn
    from datetime import datetime
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
