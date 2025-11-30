"""Course management API router."""

import json
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Any, Dict

from src.models.schemas import (
    CourseInit,
    CourseObjectives,
    GraphData,
    SetStudentProficiencyRequest,
    MessageResponse
)
from src.services.course_service import CourseService
from src.services.material_service import MaterialService
from src.services.analytics_service import AnalyticsService
from src.services.ai_service import AIService
from src.auth import get_current_user


router = APIRouter(prefix="/course", tags=["courses"])

# Initialize services
course_service = CourseService()
material_service = MaterialService()
analytics_service = AnalyticsService()
ai_service = AIService()


@router.post("/init")
async def initialize_course(
    payload: CourseInit,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Initialize a new course."""
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can create courses")
    
    course_id = course_service.initialize_course(
        course_name=payload.course_name,
        professor_username=user["username"],
        default_proficiency=payload.default_proficiency
    )
    
    return {
        "message": "Course initialized",
        "course_id": course_id,
        "course_name": payload.course_name
    }


@router.post("/{course_id}/upload-plan")
async def upload_course_plan(
    course_id: str,
    plan_file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
) -> MessageResponse:
    """Upload course plan JSON file."""
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can upload course plans")
    
    # Verify ownership
    course_service.verify_course_ownership(course_id, user["username"])
    
    # Read and validate JSON
    content = await plan_file.read()
    try:
        plan_data = json.loads(content.decode('utf-8'))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    
    # Save plan
    success = course_service.upload_course_plan(course_id, plan_data)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update course plan")
    
    return MessageResponse(
        message="Course plan uploaded successfully"
    )


@router.post("/{course_id}/upload-materials")
async def upload_course_materials(
    course_id: str,
    materials_zip: UploadFile = File(...),
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Upload course materials as ZIP file."""
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can upload materials")
    
    # Verify ownership and get course
    course = course_service.verify_course_ownership(course_id, user["username"])
    
    # Check if course has a plan
    if not course.get("course_plan"):
        raise HTTPException(status_code=400, detail="Please upload course plan before materials")
    
    try:
        # Process materials
        saved_materials, topic_mapping = await material_service.process_materials_upload(
            course_id=course_id,
            course_plan=course["course_plan"],
            materials_zip=materials_zip
        )
        
        # Save to database
        success = course_service.save_course_materials(
            course_id=course_id,
            materials=saved_materials,
            topic_mapping=topic_mapping
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update course materials")
        
        return {
            "message": "Course materials uploaded and mapped successfully",
            "course_id": course_id,
            "materials_count": len(saved_materials),
            "topic_mapping": topic_mapping
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading materials: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error uploading materials: {str(e)}")


@router.get("/{course_id}/materials")
def get_course_materials(
    course_id: str,
    topic: str = None,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get course materials, optionally filtered by topic."""
    course = course_service.get_course_by_id(course_id)
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check access
    if user.get("role") == "professor":
        if course.get("professor_username") != user["username"]:
            raise HTTPException(status_code=403, detail="Access denied")
    elif user.get("role") == "student":
        from src.database.operations import QueryDB
        query_db = QueryDB()
        enrollment = query_db.find_enrollment(user["username"], course_id)
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")
    else:
        raise HTTPException(status_code=403, detail="Invalid user role")
    
    return material_service.get_course_materials(course_id, course, topic)


@router.post("/{course_id}/set-objectives")
async def set_course_objectives(
    course_id: str,
    payload: CourseObjectives,
    user: dict = Depends(get_current_user)
) -> MessageResponse:
    """Set course objectives."""
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can set objectives")
    
    # Verify ownership
    course_service.verify_course_ownership(course_id, user["username"])
    
    # Save objectives
    success = course_service.set_course_objectives(course_id, payload.objectives)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update objectives")
    
    return MessageResponse(message="Course objectives saved successfully")


@router.post("/{course_id}/upload-roster")
async def upload_course_roster(
    course_id: str,
    roster_file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Upload class roster CSV file."""
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can upload rosters")
    
    # Verify ownership
    course_service.verify_course_ownership(course_id, user["username"])
    
    # Read and process CSV
    content = await roster_file.read()
    csv_content = content.decode('utf-8')
    
    try:
        success, student_count = course_service.upload_roster(course_id, csv_content)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update roster")
        
        return {
            "message": "Course roster uploaded successfully",
            "course_id": course_id,
            "student_count": student_count
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error uploading roster: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading roster: {str(e)}")


@router.get("/list")
def list_courses(user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """List all courses for the professor."""
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can view their courses")
    
    courses = course_service.get_courses_by_professor(user["username"])
    
    # Serialize for JSON
    for course in courses:
        course["_id"] = str(course["_id"])
        if "created_at" in course:
            course["created_at"] = course["created_at"].isoformat()
        if "updated_at" in course:
            course["updated_at"] = course["updated_at"].isoformat()
    
    return {"courses": courses}


@router.get("/{course_id}")
def get_course_details(
    course_id: str,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get detailed information about a course."""
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can view course details")
    
    course = course_service.verify_course_ownership(course_id, user["username"])
    
    # Serialize for JSON
    course["_id"] = str(course["_id"])
    if "created_at" in course:
        course["created_at"] = course["created_at"].isoformat()
    if "updated_at" in course:
        course["updated_at"] = course["updated_at"].isoformat()
    
    return course


@router.delete("/{course_id}")
def delete_course(
    course_id: str,
    user: dict = Depends(get_current_user)
) -> MessageResponse:
    """Delete a course."""
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can delete courses")
    
    # Verify ownership
    course = course_service.verify_course_ownership(course_id, user["username"])
    
    # Delete course
    deleted = course_service.delete_course(course_id)
    
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete course")
    
    return MessageResponse(
        message=f"Course '{course.get('course_name')}' deleted successfully"
    )


@router.post("/{course_id}/save-graph")
def save_knowledge_graph(
    course_id: str,
    payload: GraphData,
    user: dict = Depends(get_current_user)
) -> MessageResponse:
    """Save knowledge graph for course."""
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can save knowledge graphs")
    
    # Verify ownership
    course_service.verify_course_ownership(course_id, user["username"])
    
    # Save graph
    success = course_service.save_knowledge_graph(course_id, payload.graph_data)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save knowledge graph")
    
    return MessageResponse(message="Knowledge graph saved successfully")


@router.get("/{course_id}/get-graph")
def get_knowledge_graph(
    course_id: str,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get knowledge graph for course."""
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can view knowledge graphs")
    
    # Verify ownership
    course_service.verify_course_ownership(course_id, user["username"])
    
    # Get graph
    knowledge_graph = course_service.get_knowledge_graph(course_id)
    
    return {
        "course_id": course_id,
        "knowledge_graph": knowledge_graph
    }


@router.get("/{course_id}/enrolled-students")
def get_enrolled_students(
    course_id: str,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get all students enrolled in a course."""
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can view enrolled students")
    
    # Verify ownership
    course_service.verify_course_ownership(course_id, user["username"])
    
    # Get enrolled students
    students = course_service.get_enrolled_students(course_id)
    
    return {
        "course_id": course_id,
        "students": students,
        "total_count": len(students)
    }


@router.get("/{course_id}/analytics")
def get_course_analytics(
    course_id: str,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get comprehensive course analytics."""
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can view analytics")
    
    # Verify ownership
    course = course_service.verify_course_ownership(course_id, user["username"])
    
    # Get analytics
    analytics_data = analytics_service.get_course_analytics(course_id)
    
    return {
        "course_id": course_id,
        "course_name": course.get("course_name"),
        **analytics_data
    }


@router.post("/{course_id}/generate-report")
def generate_course_report(
    course_id: str,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generate AI-powered course report."""
    from datetime import datetime
    
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can generate reports")
    
    # Verify ownership
    course = course_service.verify_course_ownership(course_id, user["username"])
    
    # Prepare analytics data
    report_data = analytics_service.prepare_report_data(course_id)
    
    if not report_data.get("has_data"):
        return {
            "report": "No test data available yet. Students need to take tests before a report can be generated.",
            "has_data": False
        }
    
    try:
        # Generate report
        report_text = ai_service.generate_course_report(
            course_name=course.get("course_name"),
            analytics_data=report_data
        )
        
        return {
            "report": report_text,
            "has_data": True,
            "generated_at": datetime.utcnow().isoformat(),
            "course_name": course.get("course_name"),
            "statistics": {
                "total_enrolled": report_data["total_enrolled"],
                "students_with_tests": report_data["students_with_tests"],
                "participation_rate": round(report_data["participation_rate"], 2),
                "class_average": round(report_data["class_average"], 2),
                "total_tests": report_data["total_tests"],
                "topics_covered": len(report_data["topic_summary"]),
                "proficiency_distribution": report_data["proficiency_distribution"]
            }
        }
        
    except Exception as e:
        print(f"Error generating course report: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")
