"""Student API router."""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List

from src.models.schemas import (
    EnrollRequest,
    UpdateProficiencyRequest,
    MessageResponse,
    GenerateTestRequest,
    SubmitTestRequest,
    GenerateFlashcardsRequest
)
from src.services.student_service import StudentService
from src.services.course_service import CourseService
from src.services.test_service import TestService
from src.services.material_service import MaterialService
from src.services.ai_service import AIService
from src.auth import get_current_user


router = APIRouter(prefix="/student", tags=["students"])

# Initialize services
student_service = StudentService()
course_service = CourseService()
test_service = TestService()
material_service = MaterialService()
ai_service = AIService()


@router.post("/enroll")
def enroll_in_course(
    payload: EnrollRequest,
    user: dict = Depends(get_current_user)
) -> MessageResponse:
    """Enroll student in a course."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can enroll in courses")
    
    # Enroll student
    student_service.enroll_student(
        student_username=user["username"],
        course_id=payload.course_id,
        default_proficiency=payload.default_proficiency
    )
    
    return MessageResponse(
        message=f"Enrolled in course successfully with proficiency: {payload.default_proficiency}"
    )


@router.post("/update-proficiency")
def update_proficiency(
    payload: UpdateProficiencyRequest,
    user: dict = Depends(get_current_user)
) -> MessageResponse:
    """Update student proficiency for a course."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can update their proficiency")
    
    # Update proficiency
    student_service.update_proficiency(
        student_username=user["username"],
        course_id=payload.course_id,
        proficiency_level=payload.proficiency_level
    )
    
    return MessageResponse(
        message=f"Proficiency updated to '{payload.proficiency_level}' successfully"
    )


@router.get("/proficiency/{course_id}")
def get_proficiency(
    course_id: str,
    user: dict = Depends(get_current_user)
) -> Dict[str, str]:
    """Get student proficiency for a course."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can view their proficiency")
    
    proficiency = student_service.get_proficiency(user["username"], course_id)
    
    return {
        "course_id": course_id,
        "proficiency": proficiency
    }


@router.get("/enrolled-courses")
def get_enrolled_courses(user: dict = Depends(get_current_user)) -> Dict[str, List[Dict[str, Any]]]:
    """Get all courses the student is enrolled in."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can view their courses")
    
    courses = student_service.get_enrolled_courses(user["username"])
    
    return {"courses": courses}


@router.get("/available-courses")
def get_available_courses(user: dict = Depends(get_current_user)) -> Dict[str, List[Dict[str, Any]]]:
    """Get all available courses that student is not enrolled in."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can view available courses")
    
    courses = student_service.get_available_courses(user["username"])
    
    return {"courses": courses}


@router.get("/course/{course_id}")
def get_student_course_details(
    course_id: str,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get course details for enrolled student."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can view course details")
    
    # Verify enrollment
    enrollment = student_service.is_enrolled(user["username"], course_id)
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    # Get course
    course = course_service.get_course_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Serialize for JSON
    course["_id"] = str(course["_id"])
    if "created_at" in course:
        course["created_at"] = course["created_at"].isoformat()
    if "updated_at" in course:
        course["updated_at"] = course["updated_at"].isoformat()
    
    # Add enrollment info
    course["enrollment"] = {
        "proficiency_level": enrollment.get("proficiency_level", "intermediate"),
        "enrolled_at": enrollment.get("enrolled_at").isoformat() if enrollment.get("enrolled_at") else None
    }
    
    return course


@router.post("/unenroll/{course_id}")
def unenroll_from_course(
    course_id: str,
    user: dict = Depends(get_current_user)
) -> MessageResponse:
    """Unenroll student from a course."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can unenroll from courses")
    
    # Verify enrollment
    enrollment = student_service.is_enrolled(user["username"], course_id)
    if not enrollment:
        raise HTTPException(status_code=400, detail="Not enrolled in this course")
    
    # Get course for message
    course = course_service.get_course_by_id(course_id)
    
    # Unenroll
    success = student_service.unenroll_student(user["username"], course_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to unenroll from course")
    
    return MessageResponse(
        message=f"Unenrolled from course '{course.get('course_name')}' successfully"
    )


@router.get("/course/{course_id}/topics")
def get_course_topics(
    course_id: str,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
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
    topics_data = test_service.extract_topics_from_outline(course["course_plan"])
    
    return {
        "course_id": course_id,
        "topics": topics_data
    }


@router.get("/course/{course_id}/test-history")
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
        if "submitted_at" in test_record and test_record["submitted_at"]:
            test_record["submitted_at"] = test_record["submitted_at"].isoformat()
    
    return {"test_history": history}


@router.get("/test-result/{test_id}")
def get_test_result_details(
    test_id: str,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get detailed test result for review."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can view test results")
    
    # Get detailed test result
    result = test_service.get_test_result_details(test_id, user["username"])
    
    if not result:
        raise HTTPException(status_code=404, detail="Test result not found")
    
    # Serialize datetime
    if "submitted_at" in result and result["submitted_at"]:
        result["submitted_at"] = result["submitted_at"].isoformat()
    
    return result


@router.post("/course/{course_id}/generate-flashcards")
def generate_flashcards(
    course_id: str,
    payload: GenerateFlashcardsRequest,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generate flashcards for a topic."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can generate flashcards")
    
    # Verify enrollment
    course_service.verify_student_enrollment(course_id, user["username"])
    
    # Get course
    course = course_service.get_course_by_id(course_id)
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


@router.post("/generate-test")
def generate_test(
    payload: GenerateTestRequest,
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
    
    # Get student proficiency
    proficiency = student_service.get_proficiency(user["username"], payload.course_id)
    
    # Get student's performance history for personalization
    performance_history = test_service.get_student_proficiency_history(
        user["username"],
        payload.course_id
    )
    
    try:
        # Check if course has materials uploaded
        if not course.get("course_materials"):
            raise HTTPException(
                status_code=400,
                detail="No course materials available. Professor must upload course materials (PDF/PPTX files) before tests can be generated."
            )
        
        # Get material content for the topic
        material_content = material_service.get_material_content_for_topic(
            payload.course_id,
            course,
            payload.topic
        )
        
        # If no materials found for this specific topic, give clear error
        if not material_content:
            raise HTTPException(
                status_code=400,
                detail=f"No course materials found for topic '{payload.topic}'. Professor needs to upload materials for this topic or map existing materials to it."
            )
        
        # Generate test from materials only
        test_data = ai_service.generate_personalized_test_from_materials(
            topic=payload.topic,
            material_content=material_content,
            proficiency_level=proficiency,
            weak_topics=performance_history.get("weak_topics", [])[:3],
            num_questions=payload.num_questions
        )
        
        return test_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating test: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating test: {str(e)}")


@router.post("/submit-test")
def submit_test(
    payload: SubmitTestRequest,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Submit test answers and get results."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can submit tests")
    
    # Verify enrollment
    course_service.verify_student_enrollment(payload.course_id, user["username"])
    
    # Get course details
    course = course_service.get_course_by_id(payload.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get student proficiency
    proficiency = student_service.get_proficiency(user["username"], payload.course_id)
    
    try:
        # Calculate score and update proficiency
        result = test_service.submit_test(
            student_username=user["username"],
            course_id=payload.course_id,
            course_name=course.get("name", "Unknown Course"),
            topic=payload.topic,
            proficiency_level=proficiency,
            questions=payload.questions,
            student_answers=payload.answers
        )
        
        # Add message for frontend
        result["message"] = f"Test submitted! Score: {result['score']}/{result['total_questions']}"
        
        return result
        
    except Exception as e:
        print(f"Error submitting test: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error submitting test: {str(e)}")

