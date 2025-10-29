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
