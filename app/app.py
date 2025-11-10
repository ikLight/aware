from dotenv import load_dotenv
load_dotenv()

from src.database.operations import AtomicDB, QueryDB
atomic_db = AtomicDB()
query_db = QueryDB()
# Student API: Set proficiency
from fastapi import Body

import os
import json
import csv
import io
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from src.test_generator import testGenerator
from src.study_plan import StudyPlan
from src.graph_visualizer import generate_graph_visualization
from src.ai_test_generator import AITestGenerator
from src.auth import (
    create_user,
    authenticate_user,
    create_access_token,
    Token,
    UserCreate,
    get_current_user,
    logout_token,
)
from src.utils import CreateTestRequest, LoginRequest, security, ensure_db_indexes, run_uvicorn
from fastapi.security import HTTPAuthorizationCredentials
import shutil
from pathlib import Path


app = FastAPI(title="Test Generator API", version="1.0.0")

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Must be False when using wildcard origins
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Create upload directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

##-----------------------------------------------------------##

@app.on_event("startup")
def startup_event():
    ensure_db_indexes()

##-----------------------------------------------------------##

@app.post("/upload")
async def upload_files(files: list[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    # Only allow professors to upload
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can upload course material.")
    try:
        # Save uploaded files
        saved_files = []
        for file in files:
            file_path = UPLOAD_DIR / file.filename
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append(str(file_path))
        # For now, skip Gemini API and knowledge graph creation
        # Just respond with a success message
        return {
            "message": "Knowledge graph created",
            "original_files": saved_files
        }
    except Exception as e:
        print(f"error - {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading files: {str(e)}")

##-----------------------------------------------------------##

class CourseInit(BaseModel):
    course_name: str
    default_proficiency: str = "intermediate"  # Default proficiency for new students

class CourseObjectives(BaseModel):
    objectives: str

##-----------------------------------------------------------##

@app.post("/course/init")
async def init_course(
    payload: CourseInit,
    user: dict = Depends(get_current_user)
):
    """
    Step 1: Initialize a new course with a course name.
    Returns the course_id for subsequent steps.
    """
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can create courses.")
    
    try:
        # Create initial course document
        course_doc = {
            "course_name": payload.course_name,
            "professor_username": user["username"],
            "default_proficiency": payload.default_proficiency,
            "course_plan": None,
            "course_objectives": None,
            "roster": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        course_id = atomic_db.insert_course(course_doc)
        
        return {
            "message": "Course initialized",
            "course_id": course_id,
            "course_name": payload.course_name
        }
    except Exception as e:
        print(f"Error initializing course: {e}")
        raise HTTPException(status_code=500, detail=f"Error initializing course: {str(e)}")

##-----------------------------------------------------------##

@app.post("/course/{course_id}/upload-plan")
async def upload_course_plan(
    course_id: str,
    plan_file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Step 2: Upload the course plan (JSON file).
    """
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can upload course plans.")
    
    try:
        # Verify course exists and belongs to professor
        course = query_db.find_course_by_id(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        if course.get("professor_username") != user["username"]:
            raise HTTPException(status_code=403, detail="You don't have access to this course.")
        
        # For now, read the file and store it
        content = await plan_file.read()
        try:
            # Validate it's valid JSON
            plan_data = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON file.")
        
        # Update course with plan
        updated = atomic_db.update_course(
            course_id,
            {"course_plan": plan_data}
        )
        
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to update course plan.")
        
        return {
            "message": "Course plan uploaded successfully",
            "course_id": course_id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading course plan: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading course plan: {str(e)}")

##-----------------------------------------------------------##

@app.post("/course/{course_id}/set-objectives")
async def set_course_objectives(
    course_id: str,
    payload: CourseObjectives,
    user: dict = Depends(get_current_user)
):
    """
    Step 3: Set course objectives.
    """
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can set course objectives.")
    
    try:
        # Verify course exists and belongs to professor
        course = query_db.find_course_by_id(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        if course.get("professor_username") != user["username"]:
            raise HTTPException(status_code=403, detail="You don't have access to this course.")
        
        # Update course with objectives
        updated = atomic_db.update_course(
            course_id,
            {"course_objectives": payload.objectives}
        )
        
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to update course objectives.")
        
        return {
            "message": "Course objectives saved successfully",
            "course_id": course_id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error setting course objectives: {e}")
        raise HTTPException(status_code=500, detail=f"Error setting course objectives: {str(e)}")

##-----------------------------------------------------------##

@app.post("/course/{course_id}/upload-roster")
async def upload_course_roster(
    course_id: str,
    roster_file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Step 4: Upload the class roster (CSV file).
    """
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can upload rosters.")
    
    try:
        # Verify course exists and belongs to professor
        course = query_db.find_course_by_id(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        if course.get("professor_username") != user["username"]:
            raise HTTPException(status_code=403, detail="You don't have access to this course.")
        
        # Parse CSV file
        content = await roster_file.read()
        csv_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        # Extract student roster
        roster = []
        for row in csv_reader:
            student_name = row.get('studentName', '').strip()
            email_id = row.get('emailID', '').strip()
            
            if student_name and email_id:
                roster.append({
                    "studentName": student_name,
                    "emailID": email_id
                })
        
        if not roster:
            raise HTTPException(status_code=400, detail="No valid students found in roster file.")
        
        # Update course with roster
        updated = atomic_db.update_course(
            course_id,
            {"roster": roster}
        )
        
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to update course roster.")
        
        return {
            "message": "Course roster uploaded successfully",
            "course_id": course_id,
            "student_count": len(roster)
        }
    except HTTPException:
        raise
    except csv.Error as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV file: {str(e)}")
    except Exception as e:
        print(f"Error uploading roster: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading roster: {str(e)}")
##-----------------------------------------------------------##

@app.get("/course/list")
def list_courses(user: dict = Depends(get_current_user)):
    """
    List all courses for the current professor.
    """
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can view their courses.")
    
    try:
        courses = query_db.find_courses_by_professor(user["username"])
        # Convert ObjectId and datetime to string for JSON serialization
        for course in courses:
            course["_id"] = str(course["_id"])
            if "created_at" in course:
                course["created_at"] = course["created_at"].isoformat()
            if "updated_at" in course:
                course["updated_at"] = course["updated_at"].isoformat()
        return {"courses": courses}
    except Exception as e:
        print(f"Error listing courses: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing courses: {str(e)}")

##-----------------------------------------------------------##

@app.get("/course/{course_id}")
def get_course_details(course_id: str, user: dict = Depends(get_current_user)):
    """
    Get detailed information about a specific course.
    """
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can view course details.")
    
    try:
        course = query_db.find_course_by_id(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        
        # Verify the professor owns this course
        if course.get("professor_username") != user["username"]:
            raise HTTPException(status_code=403, detail="You don't have access to this course.")
        
        # Convert ObjectId and datetime to string for JSON serialization
        course["_id"] = str(course["_id"])
        if "created_at" in course:
            course["created_at"] = course["created_at"].isoformat()
        if "updated_at" in course:
            course["updated_at"] = course["updated_at"].isoformat()
        
        return course
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching course details: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching course details: {str(e)}")

##-----------------------------------------------------------##

class GraphData(BaseModel):
    graph_data: list

@app.post("/course/{course_id}/save-graph")
def save_knowledge_graph(
    course_id: str,
    payload: GraphData,
    user: dict = Depends(get_current_user)
):
    """
    Save the knowledge graph for a course.
    """
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can save knowledge graphs.")
    
    try:
        # Verify course exists and belongs to professor
        course = query_db.find_course_by_id(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        if course.get("professor_username") != user["username"]:
            raise HTTPException(status_code=403, detail="You don't have access to this course.")
        
        # Update course with graph data
        updated = atomic_db.update_course(
            course_id,
            {"knowledge_graph": payload.graph_data}
        )
        
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to save knowledge graph.")
        
        return {
            "message": "Knowledge graph saved successfully",
            "course_id": course_id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error saving knowledge graph: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving knowledge graph: {str(e)}")

##-----------------------------------------------------------##

@app.get("/course/{course_id}/get-graph")
def get_knowledge_graph(
    course_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Retrieve the saved knowledge graph for a course.
    """
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can view knowledge graphs.")
    
    try:
        # Verify course exists and belongs to professor
        course = query_db.find_course_by_id(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        if course.get("professor_username") != user["username"]:
            raise HTTPException(status_code=403, detail="You don't have access to this course.")
        
        # Get the knowledge graph, return empty list if not found
        knowledge_graph = course.get("knowledge_graph", [])
        
        return {
            "course_id": course_id,
            "knowledge_graph": knowledge_graph
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving knowledge graph: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving knowledge graph: {str(e)}")

##-----------------------------------------------------------##

@app.get("/course/{course_id}/analytics")
def get_course_analytics(
    course_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Get comprehensive analytics for a course including student performance,
    topic-wise breakdown, and individual student scores.
    Only accessible by the professor who owns the course.
    """
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can view course analytics.")
    
    try:
        # Verify course exists and belongs to professor
        course = query_db.find_course_by_id(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        if course.get("professor_username") != user["username"]:
            raise HTTPException(status_code=403, detail="You don't have access to this course.")
        
        # Get all enrolled students
        enrollments = query_db.find_enrolled_students_by_course(course_id)
        enrolled_students = {e["student_username"]: e.get("proficiency_level", "intermediate") 
                            for e in enrollments}
        
        # Get all test results for this course
        test_results = query_db.find_test_results_by_course(course_id)
        
        # Organize data by topic and student
        topic_analytics = {}
        student_analytics = {}
        
        for result in test_results:
            student = result.get("student_username")
            topic = result.get("topic")
            score = result.get("score", 0)
            total = result.get("total_questions", 10)
            percentage = result.get("percentage", 0)
            date = result.get("created_at")
            proficiency = result.get("proficiency_level", "intermediate")
            
            # Topic-wise analytics
            if topic not in topic_analytics:
                topic_analytics[topic] = {
                    "topic": topic,
                    "total_attempts": 0,
                    "total_score": 0,
                    "total_possible": 0,
                    "students_tested": set(),
                    "scores": []
                }
            
            topic_analytics[topic]["total_attempts"] += 1
            topic_analytics[topic]["total_score"] += score
            topic_analytics[topic]["total_possible"] += total
            topic_analytics[topic]["students_tested"].add(student)
            topic_analytics[topic]["scores"].append(percentage)
            
            # Student-wise analytics
            if student not in student_analytics:
                student_analytics[student] = {
                    "student_username": student,
                    "current_proficiency": enrolled_students.get(student, "intermediate"),
                    "total_tests": 0,
                    "total_score": 0,
                    "total_possible": 0,
                    "topics_tested": {},
                    "test_history": []
                }
            
            student_analytics[student]["total_tests"] += 1
            student_analytics[student]["total_score"] += score
            student_analytics[student]["total_possible"] += total
            
            # Topic breakdown per student
            if topic not in student_analytics[student]["topics_tested"]:
                student_analytics[student]["topics_tested"][topic] = {
                    "attempts": 0,
                    "best_score": 0,
                    "latest_score": 0,
                    "average_score": 0,
                    "scores": []
                }
            
            student_analytics[student]["topics_tested"][topic]["attempts"] += 1
            student_analytics[student]["topics_tested"][topic]["scores"].append(percentage)
            student_analytics[student]["topics_tested"][topic]["latest_score"] = percentage
            student_analytics[student]["topics_tested"][topic]["best_score"] = max(
                student_analytics[student]["topics_tested"][topic]["best_score"],
                percentage
            )
            
            # Add to history
            student_analytics[student]["test_history"].append({
                "topic": topic,
                "score": score,
                "total": total,
                "percentage": percentage,
                "date": date,
                "proficiency": proficiency
            })
        
        # Calculate averages and format response
        topic_summary = []
        for topic_data in topic_analytics.values():
            avg_score = (topic_data["total_score"] / topic_data["total_possible"] * 100) if topic_data["total_possible"] > 0 else 0
            topic_summary.append({
                "topic": topic_data["topic"],
                "total_attempts": topic_data["total_attempts"],
                "students_tested": len(topic_data["students_tested"]),
                "average_score": round(avg_score, 2),
                "highest_score": round(max(topic_data["scores"]) if topic_data["scores"] else 0, 2),
                "lowest_score": round(min(topic_data["scores"]) if topic_data["scores"] else 0, 2)
            })
        
        # Sort topics by average score (lowest first to identify struggling topics)
        topic_summary.sort(key=lambda x: x["average_score"])
        
        # Format student analytics
        student_summary = []
        for student_data in student_analytics.values():
            overall_percentage = (student_data["total_score"] / student_data["total_possible"] * 100) if student_data["total_possible"] > 0 else 0
            
            # Calculate average per topic
            topics_breakdown = []
            for topic, topic_info in student_data["topics_tested"].items():
                avg = sum(topic_info["scores"]) / len(topic_info["scores"]) if topic_info["scores"] else 0
                topic_info["average_score"] = round(avg, 2)
                topics_breakdown.append({
                    "topic": topic,
                    "attempts": topic_info["attempts"],
                    "best_score": round(topic_info["best_score"], 2),
                    "latest_score": round(topic_info["latest_score"], 2),
                    "average_score": round(topic_info["average_score"], 2)
                })
            
            student_summary.append({
                "student_username": student_data["student_username"],
                "current_proficiency": student_data["current_proficiency"],
                "total_tests": student_data["total_tests"],
                "overall_percentage": round(overall_percentage, 2),
                "topics_breakdown": topics_breakdown,
                "recent_tests": sorted(student_data["test_history"], 
                                      key=lambda x: x["date"], 
                                      reverse=True)[:5]  # Last 5 tests
            })
        
        # Sort students by overall performance
        student_summary.sort(key=lambda x: x["overall_percentage"], reverse=True)
        
        # Overall course statistics
        total_students = len(enrolled_students)
        students_with_tests = len(student_analytics)
        total_tests = sum(s["total_tests"] for s in student_summary)
        
        return {
            "course_id": course_id,
            "course_name": course.get("course_name"),
            "summary": {
                "total_enrolled": total_students,
                "students_with_tests": students_with_tests,
                "total_tests_taken": total_tests,
                "total_topics_tested": len(topic_analytics)
            },
            "topic_analytics": topic_summary,
            "student_analytics": student_summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching course analytics: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching analytics: {str(e)}")

##-----------------------------------------------------------##

class SetStudentProficiencyRequest(BaseModel):
    course_id: str
    student_username: str
    proficiency_level: str

@app.post("/professor/set-student-proficiency")
def set_student_proficiency(payload: SetStudentProficiencyRequest, user: dict = Depends(get_current_user)):
    """
    Professor sets initial proficiency level for a student enrolled in their course.
    This is required before students can take tests.
    """
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can set student proficiency.")
    
    try:
        # Verify course exists and belongs to professor
        course = query_db.find_course_by_id(payload.course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        if course.get("professor_username") != user["username"]:
            raise HTTPException(status_code=403, detail="You don't have access to this course.")
        
        # Verify student is enrolled
        if not query_db.is_student_enrolled(payload.student_username, payload.course_id):
            raise HTTPException(status_code=400, detail="Student is not enrolled in this course.")
        
        # Validate proficiency level
        if payload.proficiency_level not in ["beginner", "intermediate", "advanced"]:
            raise HTTPException(status_code=400, detail="Invalid proficiency level. Must be beginner, intermediate, or advanced.")
        
        # Set proficiency
        success = atomic_db.update_enrollment_proficiency(
            payload.student_username,
            payload.course_id,
            payload.proficiency_level
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update proficiency.")
        
        return {
            "message": f"Successfully set {payload.student_username}'s proficiency to {payload.proficiency_level}",
            "student_username": payload.student_username,
            "proficiency_level": payload.proficiency_level
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error setting student proficiency: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to set proficiency: {str(e)}")

##-----------------------------------------------------------##

@app.delete("/course/{course_id}")
def delete_course(course_id: str, user: dict = Depends(get_current_user)):
    """
    Delete a course. Only the professor who created it can delete it.
    """
    if user.get("role") != "professor":
        raise HTTPException(status_code=403, detail="Only professors can delete courses.")
    
    try:
        # First, verify the course exists and belongs to this professor
        course = query_db.find_course_by_id(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        
        if course.get("professor_username") != user["username"]:
            raise HTTPException(status_code=403, detail="You don't have permission to delete this course.")
        
        # Delete the course
        deleted = atomic_db.delete_course_by_id(course_id)
        if not deleted:
            raise HTTPException(status_code=500, detail="Failed to delete course.")
        
        return {"message": "Course deleted successfully", "course_name": course.get("course_name")}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting course: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting course: {str(e)}")

##-----------------------------------------------------------##

@app.post("/create-test")
def create_test_endpoint(payload: CreateTestRequest, user: dict = Depends(get_current_user)):
    print("Create test API called")
    if not os.path.exists(payload.json_path):
        raise HTTPException(status_code=400, detail="json_path does not exist.")
    if not os.path.exists(payload.course_material_json):
        raise HTTPException(status_code=400, detail="course_material_json does not exist.")

    try:
        tg = testGenerator(
            json_path=payload.json_path,
            course_material_json=payload.course_material_json
        )
        print("tg object created")
        qa_list = tg.create_test()
        return {"items": qa_list}
    except Exception as e:
        print(f"error - {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}") from e

##-----------------------------------------------------------##

@app.post("/study-plan")
def create_study_plan_endpoint(payload: CreateTestRequest, user: dict = Depends(get_current_user)):
    print("Study Plan API called")
    if not os.path.exists(payload.json_path):
        raise HTTPException(status_code=400, detail="json_path does not exist.")
    if not os.path.exists(payload.course_material_json):
        raise HTTPException(status_code=400, detail="course_material_json does not exist.")

    try:
        sp = StudyPlan(
            proficiency_path=payload.json_path,
            course_material_path=payload.course_material_json
        )
        print("Study plan generator created")
        study_plan = sp.create_study_plan()
        return {"items": study_plan}
    except Exception as e:
        print(f"Error creating study plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e

##-----------------------------------------------------------##

@app.get("/health")
def health():
    return {"status": "ok"}

##-----------------------------------------------------------##

@app.post("/auth/register", status_code=201)
def register(payload: UserCreate):
    # Validate and sanitize role
    valid_roles = ["professor", "student"]
    role = payload.role.lower() if hasattr(payload, "role") and isinstance(payload.role, str) else "student"
    if role not in valid_roles:
        role = "student"
    try:
        user = create_user(payload.username, payload.password, role)
        return {"username": user["username"], "created_at": user["created_at"], "role": user["role"]}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

##-----------------------------------------------------------##

@app.post("/auth/login", response_model=Token)
def login(payload: LoginRequest):
    user = authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token({"username": payload.username})
    # Return role for frontend redirect
    return {"access_token": token, "role": user.get("role", "student")}

##-----------------------------------------------------------##

@app.post("/auth/logout")
def logout(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    logout_token(token)
    return {"status": "logged out"}

##-----------------------------------------------------------##

@app.get("/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    return {
        "username": user.get("username"),
        "role": user.get("role", "student"),
        "created_at": user.get("created_at")
    }

##-----------------------------------------------------------##

@app.post("/student/set-proficiency")
def set_proficiency(proficiency: dict = Body(...), user: dict = Depends(get_current_user)):
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can set proficiency.")
    # Update the user's proficiency in the DB
    atomic_db.db.users.update_one(
        {"username": user["username"]},
        {"$set": {"proficiency": proficiency}}
    )
    return {"message": "Proficiency updated", "proficiency": proficiency}

##-----------------------------------------------------------##

@app.get("/student/enrolled-courses")
def get_enrolled_courses(user: dict = Depends(get_current_user)):
    """
    Get all courses where the student is enrolled.
    """
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint.")
    
    try:
        student_username = user["username"]
        
        # Find all enrollments for this student
        enrollments = query_db.find_student_enrollments(student_username)
        
        # Get full course details for each enrollment
        from bson import ObjectId
        enrolled_courses = []
        for enrollment in enrollments:
            course = query_db.find_course_by_id(enrollment["course_id"])
            if course:
                enrolled_courses.append({
                    "_id": str(course["_id"]),
                    "course_name": course.get("course_name"),
                    "professor_username": course.get("professor_username"),
                    "proficiency_level": enrollment.get("proficiency_level", "intermediate"),
                    "enrolled_at": enrollment.get("enrolled_at"),
                    "has_course_plan": course.get("course_plan") is not None
                })
        
        return {"courses": enrolled_courses}
    except Exception as e:
        print(f"Error fetching enrolled courses: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch enrolled courses")

##-----------------------------------------------------------##

@app.get("/student/available-courses")
def get_available_courses(user: dict = Depends(get_current_user)):
    """
    Get all available courses that a student can enroll in.
    """
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint.")
    
    try:
        # Get all courses
        all_courses = query_db.find_all_courses()
        
        # Get student's enrollments
        student_username = user["username"]
        enrollments = query_db.find_student_enrollments(student_username)
        enrolled_course_ids = {e["course_id"] for e in enrollments}
        
        # Serialize courses and mark which are enrolled
        from bson import ObjectId
        available_courses = []
        for course in all_courses:
            course_id = str(course["_id"])
            available_courses.append({
                "_id": course_id,
                "course_name": course.get("course_name"),
                "professor_username": course.get("professor_username"),
                "is_enrolled": course_id in enrolled_course_ids,
                "has_course_plan": course.get("course_plan") is not None
            })
        
        return {"courses": available_courses}
    except Exception as e:
        print(f"Error fetching available courses: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch available courses")

##-----------------------------------------------------------##

class EnrollRequest(BaseModel):
    course_id: str

@app.post("/student/enroll")
def enroll_in_course(payload: EnrollRequest, user: dict = Depends(get_current_user)):
    """
    Enroll a student in a course using the course's default proficiency level.
    """
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can enroll in courses.")
    
    try:
        # Verify course exists
        course = query_db.find_course_by_id(payload.course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        
        # Get default proficiency from course (fallback to intermediate if not set)
        default_proficiency = course.get("default_proficiency", "intermediate")
        
        # Enroll the student with course's default proficiency
        student_username = user["username"]
        success = atomic_db.enroll_student(
            student_username=student_username,
            course_id=payload.course_id,
            proficiency_level=default_proficiency
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to enroll in course.")
        
        return {
            "message": f"Successfully enrolled in course with {default_proficiency} proficiency level.",
            "course_name": course.get("course_name")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error enrolling student: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to enroll: {str(e)}")

##-----------------------------------------------------------##

class UpdateProficiencyRequest(BaseModel):
    course_id: str
    proficiency_level: str

@app.post("/student/update-proficiency")
def update_course_proficiency(payload: UpdateProficiencyRequest, user: dict = Depends(get_current_user)):
    """
    Update proficiency level for a specific course enrollment.
    """
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can update proficiency.")
    
    try:
        student_username = user["username"]
        
        # Verify student is enrolled
        if not query_db.is_student_enrolled(student_username, payload.course_id):
            raise HTTPException(status_code=403, detail="You are not enrolled in this course.")
        
        # Update proficiency
        success = atomic_db.update_enrollment_proficiency(
            student_username=student_username,
            course_id=payload.course_id,
            proficiency_level=payload.proficiency_level
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update proficiency.")
        
        return {
            "message": "Proficiency updated successfully",
            "proficiency_level": payload.proficiency_level
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating proficiency: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update proficiency: {str(e)}")

##-----------------------------------------------------------##

@app.get("/student/course/{course_id}/topics")
def get_course_topics(course_id: str, user: dict = Depends(get_current_user)):
    """
    Get available topics/weeks from a course's outline for test generation.
    Returns a list of topics extracted from the course plan (same as knowledge graph topics).
    """
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint.")
    
    try:
        # Find the course
        course = query_db.find_course_by_id(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        
        # Verify student is enrolled
        student_username = user["username"]
        is_enrolled = query_db.is_student_enrolled(student_username, course_id)
        
        if not is_enrolled:
            raise HTTPException(status_code=403, detail="You are not enrolled in this course.")
        
        # Extract topics from course plan
        course_plan = course.get("course_plan")
        if not course_plan:
            raise HTTPException(status_code=404, detail="Course plan not available.")
        
        print(f"Course plan type: {type(course_plan)}")
        print(f"Course plan keys: {course_plan.keys() if isinstance(course_plan, dict) else 'Not a dict'}")
        
        topics = []
        
        def extract_topics_from_outline(outline_items):
            """
            Recursively extract topics from outline structure.
            Same logic as knowledge graph extraction.
            """
            extracted = []
            if not isinstance(outline_items, list):
                return extracted
            
            for item in outline_items:
                if not isinstance(item, dict):
                    continue
                
                label = item.get("label", "")
                
                # Skip unit/week headers
                if label and not (
                    label.lower().startswith("unit ") or 
                    label.lower().startswith("week ") or
                    "unit" in label.lower() and ":" in label
                ):
                    extracted.append(label)
                
                # Recursively process children
                if "children" in item and isinstance(item["children"], list):
                    child_topics = extract_topics_from_outline(item["children"])
                    extracted.extend(child_topics)
            
            return extracted
        
        # Extract from outline
        if isinstance(course_plan, dict) and "outline" in course_plan:
            outline = course_plan["outline"]
            if isinstance(outline, list):
                topic_labels = extract_topics_from_outline(outline)
                topics = [{"label": label, "full_path": label} for label in topic_labels]
                print(f"Extracted {len(topics)} topics: {[t['label'] for t in topics]}")
        
        if not topics:
            print("Warning: No topics found in course plan")
            return {
                "course_id": course_id,
                "course_name": course.get("course_name"),
                "topics": [],
                "message": "No topics found in course plan"
            }
        
        return {
            "course_id": course_id,
            "course_name": course.get("course_name"),
            "topics": topics
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching course topics: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch topics: {str(e)}")

##-----------------------------------------------------------##

class GenerateTestRequest(BaseModel):
    course_id: str
    topic: str  # The selected topic label

class SubmitTestRequest(BaseModel):
    course_id: str
    topic: str
    questions: list  # The questions that were asked
    student_answers: dict  # {question_number: selected_answer}

@app.post("/student/generate-test")
def generate_test(payload: GenerateTestRequest, user: dict = Depends(get_current_user)):
    """
    Generate a personalized MCQ test for a specific topic using Gemini AI.
    Returns 10 questions with options and correct answers.
    """
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can generate tests.")
    
    try:
        # Verify course exists
        course = query_db.find_course_by_id(payload.course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        
        # Verify student enrollment
        student_identifier = user["username"]
        is_enrolled = query_db.is_student_enrolled(student_identifier, payload.course_id)
        
        if not is_enrolled:
            raise HTTPException(status_code=403, detail="You are not enrolled in this course.")
        
        # Get course plan
        course_plan = course.get("course_plan")
        if not course_plan:
            raise HTTPException(status_code=404, detail="Course plan not available.")
        
        print(f"[TEST GENERATION] Course plan type: {type(course_plan)}")
        print(f"[TEST GENERATION] Looking for topic: {payload.topic}")
        
        # Find the specific topic content
        topic_content = ""
        
        def find_topic_content(items, target_label):
            """Recursively search for topic content in outline."""
            for item in items:
                label = item.get("label", "")
                if label == target_label:
                    # Found the topic - extract content from children or description
                    content_parts = []
                    if "children" in item and isinstance(item["children"], list):
                        for child in item["children"]:
                            if isinstance(child, dict):
                                child_label = child.get("label", "")
                                if child_label:
                                    content_parts.append(child_label)
                    
                    result = " | ".join(content_parts) if content_parts else target_label
                    print(f"[TEST GENERATION] Found topic content: {result[:200]}")
                    return result
                
                # Search in children
                if "children" in item and isinstance(item["children"], list):
                    result = find_topic_content(item["children"], target_label)
                    if result:
                        return result
            return None
        
        if isinstance(course_plan, dict) and "outline" in course_plan:
            outline = course_plan["outline"]
            if isinstance(outline, list):
                topic_content = find_topic_content(outline, payload.topic)
        
        if not topic_content:
            print(f"[TEST GENERATION] Topic content not found, using default")
            topic_content = f"Topic: {payload.topic}. Please generate questions based on general knowledge about this topic."
        
        print(f"[TEST GENERATION] Final topic content length: {len(topic_content)}")
        
        # Get student proficiency for this course
        proficiency_level = query_db.get_enrollment_proficiency(user["username"], payload.course_id)
        if not proficiency_level:
            proficiency_level = "intermediate"  # Default fallback
        
        print(f"[TEST GENERATION] Proficiency level: {proficiency_level}")
        
        # Generate test using AI
        test_generator = AITestGenerator()
        test_result = test_generator.generate_test(
            topic=payload.topic,
            topic_content=topic_content,
            proficiency_level=proficiency_level,
            num_questions=10
        )
        
        return {
            "course_id": payload.course_id,
            "course_name": course.get("course_name"),
            "topic": payload.topic,
            "proficiency_level": proficiency_level,
            "questions": test_result["questions"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating test: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate test: {str(e)}")

##-----------------------------------------------------------##

@app.post("/student/submit-test")
def submit_test(payload: SubmitTestRequest, user: dict = Depends(get_current_user)):
    """
    Submit test answers, calculate score, and save to database.
    """
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can submit tests.")
    
    try:
        # Calculate score
        correct_answers = {}
        for question in payload.questions:
            q_num = question.get("question_number")
            correct_ans = question.get("correct_answer")
            if q_num and correct_ans:
                correct_answers[str(q_num)] = correct_ans
        
        score = 0
        for q_num, student_ans in payload.student_answers.items():
            if correct_answers.get(str(q_num)) == student_ans:
                score += 1
        
        total_questions = len(payload.questions)
        percentage = (score / total_questions * 100) if total_questions > 0 else 0
        
        # Get proficiency level for this course
        proficiency_level = query_db.get_enrollment_proficiency(user["username"], payload.course_id)
        if not proficiency_level:
            proficiency_level = "intermediate"
        
        # Get course name
        course = query_db.find_course_by_id(payload.course_id)
        course_name = course.get("course_name", "Unknown Course") if course else "Unknown Course"
        
        # Save to database
        test_result_doc = {
            "student_username": user["username"],
            "course_id": payload.course_id,
            "course_name": course_name,
            "topic": payload.topic,
            "proficiency_level": proficiency_level,
            "questions": payload.questions,
            "student_answers": payload.student_answers,
            "correct_answers": correct_answers,
            "score": score,
            "total_questions": total_questions,
            "percentage": round(percentage, 2)
        }
        
        test_id = atomic_db.insert_test_result(test_result_doc)
        
        # Calculate and update adaptive proficiency after test submission
        new_proficiency = atomic_db.calculate_and_update_adaptive_proficiency(
            user["username"], 
            payload.course_id
        )
        
        return {
            "test_id": test_id,
            "score": score,
            "total_questions": total_questions,
            "percentage": round(percentage, 2),
            "proficiency_updated": new_proficiency,
            "message": f"Test submitted successfully! You scored {score}/{total_questions}"
        }
        
    except Exception as e:
        print(f"Error submitting test: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to submit test: {str(e)}")

##-----------------------------------------------------------##

@app.get("/student/course/{course_id}/test-history")
def get_test_history(course_id: str, user: dict = Depends(get_current_user)):
    """
    Get test history for a student in a specific course.
    Returns all test attempts with date, topic, score, and proficiency.
    """
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can access test history.")
    
    try:
        student_username = user["username"]
        
        # Verify student is enrolled in the course
        if not query_db.is_student_enrolled(student_username, course_id):
            raise HTTPException(status_code=403, detail="You are not enrolled in this course.")
        
        # Get test results for this course
        test_results = query_db.find_test_results_by_student(student_username, course_id)
        
        # Format results for frontend
        from bson import ObjectId
        formatted_results = []
        for result in test_results:
            formatted_results.append({
                "_id": str(result["_id"]),
                "date": result.get("created_at"),
                "topic": result.get("topic"),
                "score": result.get("score"),
                "total_questions": result.get("total_questions"),
                "percentage": result.get("percentage"),
                "proficiency_level": result.get("proficiency_level", "intermediate"),
                "course_name": result.get("course_name", "Unknown Course")
            })
        
        return {
            "course_id": course_id,
            "test_history": formatted_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching test history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch test history: {str(e)}")

##-----------------------------------------------------------##

class GenerateFlashcardsRequest(BaseModel):
    course_id: str
    num_cards: int = 10
    style: str = "concise"  # concise or detailed
    answer_format: str = "short"  # short or detailed

@app.post("/student/course/{course_id}/generate-flashcards")
def generate_flashcards(course_id: str, payload: GenerateFlashcardsRequest, user: dict = Depends(get_current_user)):
    """
    Generate flashcards for a course using Gemini AI.
    Extracts content from course outline and generates review cards.
    """
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can generate flashcards.")
    
    try:
        # Verify course exists
        course = query_db.find_course_by_id(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        
        # Verify student enrollment
        student_identifier = user["username"]
        is_enrolled = query_db.is_student_enrolled(student_identifier, course_id)
        
        if not is_enrolled:
            raise HTTPException(status_code=403, detail="You are not enrolled in this course.")
        
        # Get course plan
        course_plan = course.get("course_plan")
        if not course_plan:
            raise HTTPException(status_code=404, detail="Course plan not available.")
        
        print(f"[FLASHCARD GENERATION] Course plan type: {type(course_plan)}")
        
        # Extract content recursively from outline
        def extract_all_content(items, content_parts=None):
            """Recursively extract all content from course outline."""
            if content_parts is None:
                content_parts = []
            
            for item in items:
                if not isinstance(item, dict):
                    continue
                
                label = item.get("label", "")
                if label and not (label.lower().startswith("unit ") or label.lower().startswith("week ")):
                    content_parts.append(label)
                
                # Recursively process children
                if "children" in item and isinstance(item["children"], list):
                    extract_all_content(item["children"], content_parts)
            
            return content_parts
        
        content_parts = []
        if isinstance(course_plan, dict) and "outline" in course_plan:
            outline = course_plan["outline"]
            if isinstance(outline, list):
                content_parts = extract_all_content(outline)
        
        if not content_parts:
            raise HTTPException(status_code=404, detail="No content found in course plan.")
        
        course_content = " | ".join(content_parts)
        print(f"[FLASHCARD GENERATION] Content length: {len(course_content)}")
        
        # Generate flashcards using Gemini
        import google.generativeai as genai
        
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured.")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = f"""Based on the following course content, generate {payload.num_cards} flashcards for review.

Course: {course.get("course_name")}
Content: {course_content}

Style: {payload.style}
Answer Format: {payload.answer_format}

Generate flashcards in JSON format with the following structure:
{{
  "cards": [
    {{
      "question": "Front of card - the question or prompt",
      "answer": "Back of card - the answer or explanation"
    }}
  ]
}}

Make the flashcards {"concise and focused" if payload.style == "concise" else "detailed and comprehensive"}.
Make the answers {"brief and to the point" if payload.answer_format == "short" else "detailed with explanations"}.
"""
        
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Parse JSON response
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        flashcard_data = json.loads(response_text)
        cards = flashcard_data.get("cards", [])
        
        return {
            "course_id": course_id,
            "course_name": course.get("course_name"),
            "cards": cards,
            "num_cards": len(cards)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating flashcards: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")

##-----------------------------------------------------------##

@app.post("/visualize-graph")
async def visualize_graph(request: Request, user: dict = Depends(get_current_user)) -> HTMLResponse:
    """
    Generate an interactive visualization of the knowledge graph.
    """
    print("Visualization endpoint called for user:", user['username'])
    
    # Path to the knowledge graph JSON file
    graph_file = UPLOAD_DIR / f"{user['username']}_knowledge_graph.json"
    print("Looking for graph file at:", graph_file)
    
    if not graph_file.exists():
        print("Graph file not found")
        raise HTTPException(status_code=404, detail="Knowledge graph data not found")
    
    try:
        print("Reading graph data...")
        # Read the knowledge graph data and handle potential formatting issues
        with open(graph_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            
        # Remove any markdown formatting
        content = content.replace("```json", "").replace("```", "").strip()
        
        # Fix unquoted property names
        import re
        content = re.sub(r'(?<!["\\])(\b\w+\b)(?=\s*:)', r'"\1"', content)
        
        try:
            graph_data = json.loads(content)
        except json.JSONDecodeError as e:
            print("JSON parse error. Content:", content[:200])
            raise HTTPException(
                status_code=400,
                detail=f"Invalid knowledge graph data: {str(e)}"
            )
        
        # Ensure proper structure
        if not isinstance(graph_data, dict):
            graph_data = {"nodes": [], "edges": []}
        
        if "nodes" not in graph_data or "edges" not in graph_data:
            print("Missing required keys in graph data")
            raise HTTPException(
                status_code=400,
                detail="Invalid graph structure: missing nodes or edges"
            )
        
        # Validate and clean data
        graph_data["nodes"] = [str(node) for node in graph_data["nodes"]]
        graph_data["edges"] = [{
            "source": str(edge.get("source", "")),
            "target": str(edge.get("target", "")),
            "relationship": str(edge.get("relationship", "related_to"))
        } for edge in graph_data["edges"]]
        
        print(f"Loaded graph data: {len(graph_data['nodes'])} nodes, {len(graph_data['edges'])} edges")
        
        # Generate the visualization HTML
        print("Generating visualization...")
        html_content = generate_graph_visualization(graph_data)
        print("Visualization generated, length:", len(html_content))
        
        # Return the HTML content with proper headers
        headers = {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache',
        }
        return HTMLResponse(content=html_content, headers=headers)
        
    except Exception as e:
        print("Visualization error:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate visualization: {str(e)}"
        )

##-----------------------------------------------------------##

if __name__ == "__main__":
    run_uvicorn()
