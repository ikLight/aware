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

    def enroll_student(self, student_username: str, course_id: str, proficiency_level: str = None) -> bool:
        """
        Enroll a student in a course.
        Creates/updates enrollment record in student_enrollments collection.
        proficiency_level can be None initially and will be set by professor.
        
        Returns True if enrolled successfully, False otherwise.
        """
        from bson import ObjectId
        try:
            enrollment_doc = {
                "student_username": student_username,
                "course_id": course_id,
                "proficiency_level": proficiency_level,  # Can be None until professor sets it
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
            return result.modified_count > 0 or result.matched_count > 0
        except:
            return False

    def calculate_and_update_adaptive_proficiency(self, student_username: str, course_id: str) -> Optional[str]:
        """
        Calculate adaptive proficiency based on last 3 test results.
        
        Rules:
        - Less than 30% on 3 consecutive tests → beginner
        - More than 30% but less than 70% on 2 out of 3 tests → intermediate
        - More than 70% on 3 out of 3 tests → advanced
        
        Returns the new proficiency level if updated, None otherwise.
        """
        try:
            # Get last 3 test results for this student and course
            last_3_tests = list(
                self.db.test_results.find({
                    "student_username": student_username,
                    "course_id": course_id
                }).sort("created_at", -1).limit(3)
            )
            
            if len(last_3_tests) < 3:
                # Not enough tests to determine adaptive proficiency
                return None
            
            # Extract percentages
            percentages = [test.get("percentage", 0) for test in last_3_tests]
            
            # Count results in different ranges
            below_30 = sum(1 for p in percentages if p < 30)
            between_30_70 = sum(1 for p in percentages if 30 <= p < 70)
            above_70 = sum(1 for p in percentages if p >= 70)
            
            new_proficiency = None
            
            # Apply rules
            if below_30 == 3:
                # All 3 tests below 30%
                new_proficiency = "beginner"
            elif above_70 == 3:
                # All 3 tests above 70%
                new_proficiency = "advanced"
            elif between_30_70 >= 2:
                # At least 2 tests between 30-70%
                new_proficiency = "intermediate"
            elif above_70 >= 2:
                # At least 2 tests above 70% (mixed with some lower)
                new_proficiency = "advanced"
            elif below_30 >= 2:
                # At least 2 tests below 30%
                new_proficiency = "beginner"
            else:
                # Mixed results, default to intermediate
                new_proficiency = "intermediate"
            
            # Update enrollment with new proficiency
            if new_proficiency:
                self.update_enrollment_proficiency(student_username, course_id, new_proficiency)
                return new_proficiency
            
            return None
        except Exception as e:
            print(f"Error calculating adaptive proficiency: {e}")
            return None



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

