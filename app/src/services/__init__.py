"""Services package."""

from src.services.course_service import CourseService
from src.services.student_service import StudentService
from src.services.test_service import TestService
from src.services.ai_service import AIService
from src.services.analytics_service import AnalyticsService
from src.services.material_service import MaterialService

__all__ = [
    "CourseService",
    "StudentService",
    "TestService",
    "AIService",
    "AnalyticsService",
    "MaterialService"
]
