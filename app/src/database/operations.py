from datetime import datetime
from typing import Optional

from .base import BaseDB



class AtomicDB(BaseDB):
    """Atomic operations that modify the database."""

    def insert_user(self, user_doc: dict) -> None:
        self.db.users.insert_one(user_doc)

    def insert_token(self, token_doc: dict) -> None:
        """Insert a token document into the tokens collection."""
        self.db.tokens.insert_one(token_doc)

    def delete_token_by_jti(self, jti: str) -> None:
        self.db.tokens.delete_one({"jti": jti})

    def insert_course(self, course_doc: dict) -> str:
        """Insert a course document and return the inserted ID."""
        result = self.db.courses.insert_one(course_doc)
        return str(result.inserted_id)

    def delete_course_by_id(self, course_id: str) -> bool:
        """Delete a course by its ID. Returns True if deleted, False otherwise."""
        from bson import ObjectId
        try:
            result = self.db.courses.delete_one({"_id": ObjectId(course_id)})
            return result.deleted_count > 0
        except:
            return False

    def update_course(self, course_id: str, update_doc: dict) -> bool:
        """Update a course document. Returns True if updated, False otherwise."""
        from bson import ObjectId
        try:
            update_doc["updated_at"] = datetime.utcnow()
            result = self.db.courses.update_one(
                {"_id": ObjectId(course_id)},
                {"$set": update_doc}
            )
            return result.modified_count > 0
        except:
            return False

    def insert_test_result(self, test_result_doc: dict) -> str:
        """
        Insert a test result document and return the inserted ID.
        
        Expected structure:
        {
            "student_username": str,
            "course_id": str,
            "topic": str,
            "questions": list,  # The actual questions asked
            "student_answers": dict,  # {question_number: selected_answer}
            "correct_answers": dict,  # {question_number: correct_answer}
            "score": int,  # Number of correct answers
            "total_questions": int,
            "percentage": float,
            "created_at": datetime
        }
        """
        test_result_doc["created_at"] = datetime.utcnow()
        result = self.db.test_results.insert_one(test_result_doc)
        return str(result.inserted_id)

    def enroll_student(self, student_username: str, course_id: str, proficiency_level: str = "intermediate") -> bool:
        """
        Enroll a student in a course.
        Creates/updates enrollment record in student_enrollments collection.
        
        Returns True if enrolled successfully, False otherwise.
        """
        from bson import ObjectId
        try:
            enrollment_doc = {
                "student_username": student_username,
                "course_id": course_id,
                "proficiency_level": proficiency_level,
                "enrolled_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Use upsert to avoid duplicate enrollments
            result = self.db.student_enrollments.update_one(
                {"student_username": student_username, "course_id": course_id},
                {"$set": enrollment_doc},
                upsert=True
            )
            return True
        except:
            return False

    def update_enrollment_proficiency(self, student_username: str, course_id: str, proficiency_level: str) -> bool:
        """
        Update proficiency level for a specific course enrollment.
        
        Returns True if updated successfully, False otherwise.
        """
        try:
            result = self.db.student_enrollments.update_one(
                {"student_username": student_username, "course_id": course_id},
                {"$set": {"proficiency_level": proficiency_level, "updated_at": datetime.utcnow()}}
            )
            return result.modified_count > 0
        except:
            return False



class QueryDB(BaseDB):
    """Read-only/query operations against the database."""

    def find_user(self, username: str) -> Optional[dict]:
        return self.db.users.find_one({"username": username})

    def find_user_no_password(self, username: str) -> Optional[dict]:
        return self.db.users.find_one({"username": username}, {"password": 0})

    def find_token_by_jti(self, jti: str) -> Optional[dict]:
        return self.db.tokens.find_one({"jti": jti})

    def find_course_by_id(self, course_id: str) -> Optional[dict]:
        """Find a course by its ID."""
        from bson import ObjectId
        try:
            return self.db.courses.find_one({"_id": ObjectId(course_id)})
        except:
            return None

    def find_courses_by_professor(self, professor_username: str) -> list[dict]:
        """Find all courses created by a professor."""
        return list(self.db.courses.find({"professor_username": professor_username}))

    def find_courses_by_student(self, student_email: str) -> list[dict]:
        """
        Find all courses where a student is enrolled (appears in the roster).
        """
        return list(self.db.courses.find({"roster.emailID": student_email}))

    def find_test_results_by_student(self, student_username: str, course_id: Optional[str] = None) -> list[dict]:
        """
        Find all test results for a student, optionally filtered by course.
        """
        query = {"student_username": student_username}
        if course_id:
            query["course_id"] = course_id
        return list(self.db.test_results.find(query).sort("created_at", -1))

    def find_all_courses(self) -> list[dict]:
        """
        Find all courses in the database.
        """
        return list(self.db.courses.find())

    def find_student_enrollments(self, student_username: str) -> list[dict]:
        """
        Find all course enrollments for a student.
        Returns enrollment records with course_id and proficiency_level.
        """
        return list(self.db.student_enrollments.find({"student_username": student_username}))

    def is_student_enrolled(self, student_username: str, course_id: str) -> bool:
        """
        Check if a student is enrolled in a specific course.
        """
        enrollment = self.db.student_enrollments.find_one({
            "student_username": student_username,
            "course_id": course_id
        })
        return enrollment is not None

    def get_enrollment_proficiency(self, student_username: str, course_id: str) -> Optional[str]:
        """
        Get the proficiency level for a specific enrollment.
        Returns the proficiency level or None if not enrolled.
        """
        enrollment = self.db.student_enrollments.find_one({
            "student_username": student_username,
            "course_id": course_id
        })
        return enrollment.get("proficiency_level") if enrollment else None

    def find_test_results_by_course(self, course_id: str) -> list[dict]:
        """
        Find all test results for a specific course.
        Returns all test attempts by all students enrolled in the course.
        """
        return list(self.db.test_results.find({"course_id": course_id}).sort("created_at", -1))

    def find_enrolled_students_by_course(self, course_id: str) -> list[dict]:
        """
        Find all students enrolled in a specific course.
        Returns enrollment records with student info.
        """
        return list(self.db.student_enrollments.find({"course_id": course_id}))

