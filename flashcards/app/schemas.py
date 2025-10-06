from pydantic import BaseModel, Field
from typing import List

class Flashcard(BaseModel):
    question: str
    answer: str
    tags: List[str] = []
    difficulty: str = Field(default="medium", description="easy|medium|hard")

class GenerateResponse(BaseModel):
    source_bytes: int
    total_chars: int
    num_cards: int
    cards: List[Flashcard]
