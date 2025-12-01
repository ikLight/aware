"""Course management service layer."""

from typing import Dict, List, Any, Optional
from datetime import datetime
from fastapi import HTTPException
import csv
import io

from src.database.operations import AtomicDB, QueryDB
from src.config.settings import settings


class CourseService:
    """Business logic for course operations."""
    
    def __init__(self):
        self.atomic_db = AtomicDB()
        self.query_db = QueryDB()
    
    def initialize_course(
        self,
        course_name: str,
        professor_username: str,
        default_proficiency: str = "intermediate"
    ) -> str:
        """
        Initialize a new course.
        
        Args:
            course_name: Name of the course
            professor_username: Username of the professor
            default_proficiency: Default proficiency level for students
            
        Returns:
            Course ID
        """
        course_doc = {
            "course_name": course_name,
            "professor_username": professor_username,
            "default_proficiency": default_proficiency,
            "course_plan": None,
            "course_objectives": None,
            "roster": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        return self.atomic_db.insert_course(course_doc)
    
    def upload_course_plan(
        self,
        course_id: str,
        plan_data: Dict[str, Any]
    ) -> bool:
        """
        Upload course plan JSON data.
        
        Args:
            course_id: Course identifier
            plan_data: Parsed JSON plan data
            
        Returns:
            Success status
        """
        return self.atomic_db.update_course(
            course_id,
            {"course_plan": plan_data}
        )
    
    def set_course_objectives(
        self,
        course_id: str,
        objectives: str
    ) -> bool:
        """
        Set course objectives.
        
        Args:
            course_id: Course identifier
            objectives: Course objectives text
            
        Returns:
            Success status
        """
        return self.atomic_db.update_course(
            course_id,
            {"course_objectives": objectives}
        )
    
    def upload_roster(
        self,
        course_id: str,
        roster_content: str
    ) -> tuple[bool, int]:
        """
        Upload and parse class roster from CSV.
        
        Args:
            course_id: Course identifier
            roster_content: CSV content as string
            
        Returns:
            Tuple of (success, student_count)
        """
        csv_reader = csv.DictReader(io.StringIO(roster_content))
        
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
            raise ValueError("No valid students found in roster file")
        
        success = self.atomic_db.update_course(
            course_id,
            {"roster": roster}
        )
        
        return success, len(roster)
    
    def save_course_materials(
        self,
        course_id: str,
        materials: List[Dict[str, str]],
        topic_mapping: Dict[str, List[str]],
        parsed_materials: Dict[str, str] = None,
        topic_content_mapping: Dict[str, str] = None
    ) -> bool:
        """
        Save course materials and topic mapping.
        
        Args:
            course_id: Course identifier
            materials: List of material metadata
            topic_mapping: Mapping of topics to materials
            parsed_materials: Mapping of filenames to extracted content
            topic_content_mapping: Mapping of topics to their relevant content
            
        Returns:
            Success status
        """
        update_data = {
            "course_materials": materials,
            "material_topic_mapping": topic_mapping
        }
        
        if parsed_materials is not None:
            update_data["parsed_materials"] = parsed_materials
        
        if topic_content_mapping is not None:
            update_data["topic_content_mapping"] = topic_content_mapping
        
        return self.atomic_db.update_course(course_id, update_data)
    
    def get_course_by_id(self, course_id: str) -> Optional[Dict[str, Any]]:
        """Get course by ID."""
        return self.query_db.find_course_by_id(course_id)
    
    def get_courses_by_professor(self, professor_username: str) -> List[Dict[str, Any]]:
        """Get all courses for a professor."""
        return self.query_db.find_courses_by_professor(professor_username)
    
    def get_all_courses(self) -> List[Dict[str, Any]]:
        """Get all courses."""
        return self.query_db.find_all_courses()
    
    def delete_course(self, course_id: str) -> bool:
        """Delete a course."""
        return self.atomic_db.delete_course_by_id(course_id)
    
    def save_knowledge_graph(
        self,
        course_id: str,
        graph_data: List[Any]
    ) -> bool:
        """Save knowledge graph for course."""
        return self.atomic_db.update_course(
            course_id,
            {"knowledge_graph": graph_data}
        )
    
    def get_knowledge_graph(self, course_id: str) -> List[Any]:
        """Get knowledge graph for course."""
        course = self.get_course_by_id(course_id)
        return course.get("knowledge_graph", []) if course else []
    
    def verify_course_ownership(
        self,
        course_id: str,
        professor_username: str
    ) -> Dict[str, Any]:
        """
        Verify course exists and belongs to professor.
        
        Args:
            course_id: Course identifier
            professor_username: Professor's username
            
        Returns:
            Course document
            
        Raises:
            HTTPException: If course not found or access denied
        """
        course = self.get_course_by_id(course_id)
        
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        if course.get("professor_username") != professor_username:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return course
    
    def get_enrolled_students(self, course_id: str) -> List[Dict[str, Any]]:
        """
        Get all students enrolled in a course with their info.
        
        Args:
            course_id: Course identifier
            
        Returns:
            List of enrolled students with their details
        """
        enrollments = self.query_db.find_enrollments_by_course(course_id)
        
        students = []
        for enrollment in enrollments:
            # Get user info
            user = self.query_db.find_user(enrollment.get("student_username"))
            
            students.append({
                "username": enrollment.get("student_username"),
                "email": user.get("email") if user else None,
                "proficiency_level": enrollment.get("proficiency_level", "intermediate"),
                "enrolled_at": enrollment.get("enrolled_at").isoformat() if enrollment.get("enrolled_at") else None
            })
        
        return students
    
    def verify_student_enrollment(
        self,
        course_id: str,
        student_username: str
    ) -> Dict[str, Any]:
        """
        Verify course exists and student is enrolled.
        
        Args:
            course_id: Course identifier
            student_username: Student's username
            
        Returns:
            Course document
            
        Raises:
            HTTPException: If course not found or not enrolled
        """
        course = self.get_course_by_id(course_id)
        
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        if not self.query_db.is_student_enrolled(student_username, course_id):
            raise HTTPException(status_code=403, detail="Not enrolled in this course")
        
        return course
