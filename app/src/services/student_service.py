"""Student enrollment and management service."""

from typing import Dict, List, Any
from fastapi import HTTPException

from src.database.operations import AtomicDB, QueryDB


class StudentService:
    """Business logic for student operations."""
    
    def __init__(self):
        self.atomic_db = AtomicDB()
        self.query_db = QueryDB()
    
    def enroll_student(
        self,
        student_username: str,
        course_id: str,
        default_proficiency: str = "intermediate"
    ) -> bool:
        """
        Enroll a student in a course.
        
        Args:
            student_username: Student's username
            course_id: Course identifier
            default_proficiency: Proficiency level for enrollment
            
        Returns:
            Success status
        """
        return self.atomic_db.enroll_student(
            student_username=student_username,
            course_id=course_id,
            proficiency_level=default_proficiency
        )
    
    def update_proficiency(
        self,
        student_username: str,
        course_id: str,
        proficiency_level: str
    ) -> bool:
        """
        Update student's proficiency for a course.
        
        Args:
            student_username: Student's username
            course_id: Course identifier
            proficiency_level: New proficiency level
            
        Returns:
            Success status
        """
        # Validate proficiency level
        valid_levels = ["beginner", "intermediate", "advanced"]
        if proficiency_level not in valid_levels:
            raise ValueError(f"Invalid proficiency level. Must be one of {valid_levels}")
        
        return self.atomic_db.update_enrollment_proficiency(
            student_username=student_username,
            course_id=course_id,
            proficiency_level=proficiency_level
        )
    
    def get_enrolled_courses(
        self,
        student_username: str
    ) -> List[Dict[str, Any]]:
        """
        Get all courses a student is enrolled in.
        
        Args:
            student_username: Student's username
            
        Returns:
            List of course details
        """
        enrollments = self.query_db.find_student_enrollments(student_username)
        
        enrolled_courses = []
        for enrollment in enrollments:
            try:
                course = self.query_db.find_course_by_id(enrollment["course_id"])
                if course:
                    # Serialize enrolled_at datetime
                    enrolled_at = enrollment.get("enrolled_at")
                    enrolled_at_str = enrolled_at.isoformat() if enrolled_at else None
                    
                    enrolled_courses.append({
                        "_id": str(course["_id"]),
                        "course_name": course.get("course_name"),
                        "professor_username": course.get("professor_username"),
                        "proficiency_level": enrollment.get("proficiency_level", "intermediate"),
                        "enrolled_at": enrolled_at_str,
                        "has_course_plan": course.get("course_plan") is not None
                    })
                else:
                    # Course not found - enrollment may be stale
                    print(f"Warning: Course {enrollment['course_id']} not found for enrollment")
            except Exception as e:
                print(f"Error processing enrollment for course {enrollment.get('course_id')}: {e}")
                continue
        
        return enrolled_courses
    
    def get_available_courses(
        self,
        student_username: str
    ) -> List[Dict[str, Any]]:
        """
        Get all available courses with enrollment status.
        
        Args:
            student_username: Student's username
            
        Returns:
            List of all courses with enrollment status
        """
        all_courses = self.query_db.find_all_courses()
        enrollments = self.query_db.find_student_enrollments(student_username)
        enrolled_course_ids = {e["course_id"] for e in enrollments}
        
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
        
        return available_courses
    
    def get_proficiency(
        self,
        student_username: str,
        course_id: str
    ) -> str:
        """
        Get student's proficiency level for a course.
        
        Args:
            student_username: Student's username
            course_id: Course identifier
            
        Returns:
            Proficiency level
        """
        proficiency = self.query_db.get_enrollment_proficiency(
            student_username,
            course_id
        )
        return proficiency or "intermediate"
    
    def is_enrolled(
        self,
        student_username: str,
        course_id: str
    ) -> Dict[str, Any]:
        """
        Check if student is enrolled in a course.
        
        Args:
            student_username: Student's username
            course_id: Course identifier
            
        Returns:
            Enrollment record or None
        """
        return self.query_db.find_enrollment(student_username, course_id)
    
    def unenroll_student(
        self,
        student_username: str,
        course_id: str
    ) -> bool:
        """
        Unenroll a student from a course.
        
        Args:
            student_username: Student's username
            course_id: Course identifier
            
        Returns:
            Success status
        """
        return self.atomic_db.unenroll_student(student_username, course_id)
