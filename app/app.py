# app.py
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn


from src.test_generator import testGenerator
from src.study_plan import studyPlan

app = FastAPI(title="Test Generator API", version="1.0.0")

class CreateTestRequest(BaseModel):
    json_path: str                 
    course_material_json: str      

@app.post("/create-test")
def create_test_endpoint(payload: CreateTestRequest):
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
        raise HTTPException(status_code=500, detail=f"Internal error: {e}") from e
    
@app.post("/study-plan")
def create_study_plan_endpoint(payload: CreateTestRequest):
    print("Study Plan API called")
    if not os.path.exists(payload.json_path):
        raise HTTPException(status_code=400, detail="json_path does not exist.")
    if not os.path.exists(payload.course_material_json):
        raise HTTPException(status_code=400, detail="course_material_json does not exist.")

    try:
        sp = studyPlan(
            json_path=payload.json_path,
            course_material_json=payload.course_material_json
        )
        print("sp object created")
        study_plan = sp.create_study_plan()
        return {"items": study_plan}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}") from e


@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
