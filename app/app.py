import os
import json
from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
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
    try:
        # Save uploaded files
        saved_files = []
        for file in files:
            file_path = UPLOAD_DIR / file.filename
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append(str(file_path))
        
        # Parse course materials using Gemini
        from src.course_parser import parse_course_materials, convert_to_course_material
        
        # Generate knowledge graph
        graph_data = parse_course_materials(saved_files)
        
        # Save knowledge graph
        graph_path = UPLOAD_DIR / f"{user['username']}_knowledge_graph.json"
        with open(graph_path, 'w') as f:
            json.dump(graph_data, f, indent=2)
            
        # Convert to course material format
        course_material = convert_to_course_material(graph_data)
        
        # Save course material
        course_material_path = UPLOAD_DIR / f"{user['username']}_course_material.json"
        with open(course_material_path, 'w') as f:
            json.dump(course_material, f, indent=2)
            
        # Create default student proficiency
        student_proficiency = {
            "student_id": user['username'],
            "proficiency_level": "intermediate",
            "topics": {topic: "intermediate" for topic in course_material['topics']}
        }
        
        # Save student proficiency
        proficiency_path = UPLOAD_DIR / f"{user['username']}_proficiency.json"
        with open(proficiency_path, 'w') as f:
            json.dump(student_proficiency, f, indent=2)
            
        return {
            "course_material": str(course_material_path),
            "proficiency": str(proficiency_path),
            "knowledge_graph": str(graph_path),
            "original_files": saved_files
        }
    except Exception as e:
        print(f"error - {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading files: {str(e)}")

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
    try:
        user = create_user(payload.username, payload.password)
        return {"username": user["username"], "created_at": user["created_at"]}
    except HTTPException as e:
        # Re-raise HTTP exceptions (like username already exists)
        raise e
    except Exception as e:
        # Handle other unexpected errors
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
    return {"access_token": token}

##-----------------------------------------------------------##

@app.post("/auth/logout")
def logout(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    logout_token(token)
    return {"status": "logged out"}

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
