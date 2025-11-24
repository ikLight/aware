"""API routers package."""

from src.api.auth_routes import router as auth_router
from src.api.course_routes import router as course_router
from src.api.student_routes import router as student_router
from src.api.test_routes import router as test_router

__all__ = [
    "auth_router",
    "course_router",
    "student_router",
    "test_router"
]
