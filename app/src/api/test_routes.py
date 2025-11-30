"""Test generation and submission API router."""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List

from src.models.schemas import (
    GenerateTestRequest,
    GeneratePersonalizedTestRequest,
    SubmitTestRequest,
    GenerateFlashcardsRequest,
    MessageResponse
)
from src.services.test_service import TestService
from src.services.student_service import StudentService
from src.services.course_service import CourseService
from src.services.material_service import MaterialService
from src.services.ai_service import AIService
from src.auth import get_current_user


router = APIRouter(prefix="/test", tags=["tests"])

# Initialize services
test_service = TestService()
student_service = StudentService()
course_service = CourseService()
material_service = MaterialService()
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


@router.post("/generate-personalized")
def generate_personalized_test(
    payload: GeneratePersonalizedTestRequest,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generate personalized test from uploaded course materials."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can generate tests")
    
    # Verify enrollment
    course_service.verify_student_enrollment(payload.course_id, user["username"])
    
    # Get course
    course = course_service.get_course_by_id(payload.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if course has materials
    if not course.get("course_materials"):
        raise HTTPException(
            status_code=400,
            detail="No course materials available. Professor needs to upload materials first."
        )
    
    # Get student proficiency
    proficiency = student_service.get_proficiency(user["username"], payload.course_id)
    
    # Get student's performance history for personalization
    performance_history = test_service.get_student_proficiency_history(
        user["username"],
        payload.course_id
    )
    
    try:
        # Extract material content for the topic
        if payload.topic:
            material_content = material_service.get_material_content_for_topic(
                payload.course_id,
                course,
                payload.topic
            )
            
            if not material_content:
                # Fallback to course plan if no materials mapped to this topic
                if not course.get("course_plan"):
                    raise HTTPException(
                        status_code=400,
                        detail=f"No materials found for topic '{payload.topic}'"
                    )
                
                # Use course plan content as fallback
                topic_content = test_service.extract_topic_content(
                    course["course_plan"],
                    payload.topic
                )
                
                if not topic_content:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Topic '{payload.topic}' not found"
                    )
                
                # Generate test from course plan
                test_data = ai_service.generate_test(
                    topic=payload.topic,
                    topic_content=topic_content,
                    proficiency_level=proficiency,
                    num_questions=payload.num_questions
                )
                test_data["based_on_materials"] = False
                test_data["note"] = "Generated from course plan (no materials available for this topic)"
            else:
                # Generate personalized test from materials
                test_data = ai_service.generate_personalized_test_from_materials(
                    topic=payload.topic,
                    material_content=material_content,
                    proficiency_level=proficiency,
                    weak_topics=performance_history.get("weak_topics", [])[:3],
                    num_questions=payload.num_questions
                )
        else:
            # No specific topic - use all materials
            material_content = material_service.get_all_material_content(
                payload.course_id,
                course
            )
            
            if not material_content:
                raise HTTPException(
                    status_code=400,
                    detail="No course materials available"
                )
            
            test_data = ai_service.generate_personalized_test_from_materials(
                topic="General Course Content",
                material_content=material_content,
                proficiency_level=proficiency,
                weak_topics=performance_history.get("weak_topics", [])[:3],
                num_questions=payload.num_questions
            )
        
        return {
            "message": "Personalized test generated successfully",
            "topic": payload.topic or "General Course Content",
            "proficiency_level": proficiency,
            "personalization": {
                "based_on_history": performance_history.get("has_history", False),
                "weak_topics_addressed": len(performance_history.get("weak_topics", [])[:3]),
                "total_past_tests": performance_history.get("total_tests", 0)
            },
            "test": test_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating personalized test: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error generating personalized test: {str(e)}"
        )


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
