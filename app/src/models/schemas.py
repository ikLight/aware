"""Pydantic models for request/response validation."""

from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# ============================================================================
# Authentication Models
# ============================================================================

class UserCreate(BaseModel):
    """User registration model."""
    username: str
    password: str
    role: str = "student"
    email: Optional[str] = None


class LoginRequest(BaseModel):
    """User login model."""
    username: str
    password: str


class Token(BaseModel):
    """JWT token model."""
    access_token: str
    role: str
    token_type: str = "bearer"


# ============================================================================
# Course Models
# ============================================================================

class CourseInit(BaseModel):
    """Course initialization model."""
    course_name: str
    default_proficiency: str = "intermediate"


class CourseObjectives(BaseModel):
    """Course objectives model."""
    objectives: str


class GraphData(BaseModel):
    """Knowledge graph data model."""
    graph_data: List[Any]


# ============================================================================
# Student Models
# ============================================================================

class EnrollRequest(BaseModel):
    """Student enrollment model."""
    course_id: str
    default_proficiency: str = "intermediate"  # Default proficiency level


class UpdateProficiencyRequest(BaseModel):
    """Update student proficiency model."""
    course_id: str
    proficiency_level: str


class SetStudentProficiencyRequest(BaseModel):
    """Professor sets student proficiency model."""
    course_id: str
    student_username: str
    proficiency_level: str


# ============================================================================
# Test Generation Models
# ============================================================================

class GenerateTestRequest(BaseModel):
    """Test generation request model."""
    course_id: str
    topic: str
    num_questions: int = 10


class GeneratePersonalizedTestRequest(BaseModel):
    """Personalized test generation request model from materials."""
    course_id: str
    topic: str
    num_questions: int = 10
    use_materials: bool = True  # Generate from uploaded materials


class SubmitTestRequest(BaseModel):
    """Test submission model."""
    course_id: str
    topic: str
    questions: List[Dict[str, Any]]
    answers: Dict[str, str]


class CreateTestRequest(BaseModel):
    """Legacy test creation model."""
    json_path: str
    course_material_json: str


# ============================================================================
# Flashcard Models
# ============================================================================

class GenerateFlashcardsRequest(BaseModel):
    """Flashcard generation request model."""
    course_id: str
    topic: str
    num_flashcards: int = 10


# ============================================================================
# Response Models
# ============================================================================

class CourseResponse(BaseModel):
    """Course response model."""
    _id: str
    course_name: str
    professor_username: str
    default_proficiency: str
    created_at: str
    updated_at: str
    has_course_plan: bool = False


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str


class SuccessResponse(BaseModel):
    """Generic success response."""
    success: bool
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
