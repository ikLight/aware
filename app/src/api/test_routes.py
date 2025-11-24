"""Test generation and submission API router."""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List

from src.models.schemas import (
    GenerateTestRequest,
    SubmitTestRequest,
    GenerateFlashcardsRequest,
    MessageResponse
)
from src.services.test_service import TestService
from src.services.student_service import StudentService
from src.services.course_service import CourseService
from src.services.ai_service import AIService
from src.auth import get_current_user


router = APIRouter(prefix="/test", tags=["tests"])

# Initialize services
test_service = TestService()
student_service = StudentService()
course_service = CourseService()
ai_service = AIService()


@router.post("/generate")
def generate_test(
    payload: GenerateTestRequest,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generate adaptive test for student."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can generate tests")
    
    # Verify enrollment
    course_service.verify_student_enrollment(payload.course_id, user["username"])
    
    # Get course
    course = course_service.get_course_by_id(payload.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course.get("course_plan"):
        raise HTTPException(status_code=400, detail="Course plan not available")
    
    # Get student proficiency
    proficiency = student_service.get_proficiency(user["username"], payload.course_id)
    
    # Extract topic content
    topic_content = test_service.extract_topic_content(
        course["course_plan"],
        payload.topic
    )
    
    if not topic_content:
        raise HTTPException(status_code=404, detail=f"Topic '{payload.topic}' not found in course")
    
    try:
        # Generate test using AI service
        test_data = ai_service.generate_test(
            topic=payload.topic,
            topic_content=topic_content,
            difficulty=proficiency,
            num_questions=payload.num_questions
        )
        
        return {
            "message": "Test generated successfully",
            "topic": payload.topic,
            "difficulty": proficiency,
            "test": test_data
        }
        
    except Exception as e:
        print(f"Error generating test: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating test: {str(e)}")


@router.post("/submit")
def submit_test(
    payload: SubmitTestRequest,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Submit test answers and get results."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can submit tests")
    
    # Verify enrollment
    course_service.verify_student_enrollment(payload.course_id, user["username"])
    
    try:
        # Calculate score and update proficiency
        result = test_service.submit_test(
            course_id=payload.course_id,
            student_username=user["username"],
            topic=payload.topic,
            questions=payload.questions,
            answers=payload.answers
        )
        
        return result
        
    except Exception as e:
        print(f"Error submitting test: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error submitting test: {str(e)}")


@router.get("/history/{course_id}")
def get_test_history(
    course_id: str,
    user: dict = Depends(get_current_user)
) -> Dict[str, List[Dict[str, Any]]]:
    """Get student's test history for a course."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can view their test history")
    
    # Verify enrollment
    course_service.verify_student_enrollment(course_id, user["username"])
    
    # Get history
    history = test_service.get_test_history(user["username"], course_id)
    
    # Serialize for JSON
    for test_record in history:
        if "_id" in test_record:
            test_record["_id"] = str(test_record["_id"])
        if "submitted_at" in test_record:
            test_record["submitted_at"] = test_record["submitted_at"].isoformat()
    
    return {"test_history": history}


@router.get("/topics/{course_id}")
def get_course_topics(
    course_id: str,
    user: dict = Depends(get_current_user)
) -> Dict[str, List[str]]:
    """Get all topics available in a course."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can view course topics")
    
    # Verify enrollment
    course_service.verify_student_enrollment(course_id, user["username"])
    
    # Get course
    course = course_service.get_course_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course.get("course_plan"):
        raise HTTPException(status_code=400, detail="Course plan not available")
    
    # Extract all topics
    topics = test_service.extract_topics_from_outline(course["course_plan"])
    
    return {
        "course_id": course_id,
        "topics": topics
    }


@router.post("/flashcards")
def generate_flashcards(
    payload: GenerateFlashcardsRequest,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generate flashcards for a topic."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can generate flashcards")
    
    # Verify enrollment
    course_service.verify_student_enrollment(payload.course_id, user["username"])
    
    # Get course
    course = course_service.get_course_by_id(payload.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course.get("course_plan"):
        raise HTTPException(status_code=400, detail="Course plan not available")
    
    # Extract topic content
    topic_content = test_service.extract_topic_content(
        course["course_plan"],
        payload.topic
    )
    
    if not topic_content:
        raise HTTPException(status_code=404, detail=f"Topic '{payload.topic}' not found in course")
    
    try:
        # Generate flashcards
        flashcards = ai_service.generate_flashcards(
            topic=payload.topic,
            topic_content=topic_content,
            num_flashcards=payload.num_flashcards
        )
        
        return {
            "message": "Flashcards generated successfully",
            "topic": payload.topic,
            "flashcards": flashcards
        }
        
    except Exception as e:
        print(f"Error generating flashcards: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating flashcards: {str(e)}")
