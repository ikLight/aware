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

