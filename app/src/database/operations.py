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



class QueryDB(BaseDB):
    """Read-only/query operations against the database."""

    def find_user(self, username: str) -> Optional[dict]:
        return self.db.users.find_one({"username": username})

    def find_user_no_password(self, username: str) -> Optional[dict]:
        return self.db.users.find_one({"username": username}, {"password": 0})

    def find_token_by_jti(self, jti: str) -> Optional[dict]:
        return self.db.tokens.find_one({"jti": jti})

