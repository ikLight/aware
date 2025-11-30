"""AI service layer for LLM operations."""

import json
import google.generativeai as genai
from openai import OpenAI
from typing import Dict, List, Any

from src.config.settings import settings
from src.prompts.templates import PromptTemplates


class AIService:
    """Business logic for AI/LLM operations."""
    
    def __init__(self):
        """Initialize Gemini and OpenAI APIs."""
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY not configured")
        
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # Initialize OpenAI client for course reports
        if settings.OPENAI_API_KEY:
            self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            self.openai_client = None
    
    def generate_test(
        self,
        topic: str,
        topic_content: str,
        proficiency_level: str,
        num_questions: int = 10
    ) -> Dict[str, Any]:
        """
        Generate MCQ test using Gemini AI.
        
        Args:
            topic: Topic name
            topic_content: Course content for the topic
            proficiency_level: Student proficiency level
            num_questions: Number of questions to generate
            
        Returns:
            Generated test with questions
        """
        # Configure model with structured JSON response
        model = genai.GenerativeModel(
            settings.GEMINI_MODEL_TEST,
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": self._get_test_schema()
            }
        )
        
        # Build prompt
        prompt = PromptTemplates.test_generation(
            topic=topic,
            topic_content=topic_content,
            proficiency_level=proficiency_level,
            num_questions=num_questions
        )
        
        # Generate content
        response = model.generate_content(prompt)
        
        # Parse structured response
        try:
            # The response is already structured, access it directly
            test_data = json.loads(response.text)
        except json.JSONDecodeError:
            # Fallback: try to extract from response parts
            test_data = response.candidates[0].content.parts[0].text
            if isinstance(test_data, str):
                test_data = json.loads(test_data)
        
        # Validate and return
        if "questions" not in test_data:
            raise ValueError("Invalid test format: missing 'questions' key")
        
        return {
            "topic": topic,
            "proficiency_level": proficiency_level,
            "num_questions": len(test_data["questions"]),
            "questions": test_data["questions"]
        }
    
    def generate_personalized_test_from_materials(
        self,
        topic: str,
        material_content: str,
        proficiency_level: str,
        weak_topics: List[Dict[str, Any]] = None,
        num_questions: int = 10
    ) -> Dict[str, Any]:
        """
        Generate personalized MCQ test from course materials using Gemini AI.
        Takes into account student's weak areas and performance history.
        
        Args:
            topic: Topic name
            material_content: Text content extracted from course materials
            proficiency_level: Student proficiency level
            weak_topics: List of topics student struggles with
            num_questions: Number of questions to generate
            
        Returns:
            Generated test with questions
        """
        # Configure model with structured JSON response
        model = genai.GenerativeModel(
            settings.GEMINI_MODEL_TEST,
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": self._get_test_schema()
            }
        )
        
        # Build personalized prompt
        prompt = PromptTemplates.personalized_test_generation(
            topic=topic,
            material_content=material_content,
            proficiency_level=proficiency_level,
            weak_topics=weak_topics,
            num_questions=num_questions
        )
        
        # Generate content
        response = model.generate_content(prompt)
        
        # Parse structured response
        try:
            test_data = json.loads(response.text)
        except json.JSONDecodeError:
            # Fallback: try to extract from response parts
            test_data = response.candidates[0].content.parts[0].text
            if isinstance(test_data, str):
                test_data = json.loads(test_data)
        
        # Validate and return
        if "questions" not in test_data:
            raise ValueError("Invalid test format: missing 'questions' key")
        
        return {
            "topic": topic,
            "proficiency_level": proficiency_level,
            "num_questions": len(test_data["questions"]),
            "questions": test_data["questions"],
            "personalized": True,
            "based_on_materials": True
        }
    
    def generate_course_report(
        self,
        course_name: str,
        analytics_data: Dict[str, Any]
    ) -> str:
        """
        Generate AI-powered course report using OpenAI.
        
        Args:
            course_name: Name of the course
            analytics_data: Prepared analytics data
            
        Returns:
            Generated report text
        """
        if not self.openai_client:
            raise RuntimeError("OPENAI_API_KEY not configured")
        
        # Build prompt
        prompt = PromptTemplates.course_report(
            course_name=course_name,
            total_enrolled=analytics_data["total_enrolled"],
            students_with_tests=analytics_data["students_with_tests"],
            participation_rate=analytics_data["participation_rate"],
            class_average=analytics_data["class_average"],
            proficiency_distribution=analytics_data["proficiency_distribution"],
            topic_summary=analytics_data["topic_summary"]
        )
        
        # Generate content using OpenAI
        response = self.openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an educational analytics expert. Generate comprehensive, insightful course performance reports."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        return response.choices[0].message.content
    
    def map_materials_to_topics(
        self,
        topic_paths: List[str],
        materials: List[Dict[str, str]]
    ) -> Dict[str, List[str]]:
        """
        Map course materials to topics using AI.
        
        Args:
            topic_paths: List of topic paths from course outline
            materials: List of materials with filename and content
            
        Returns:
            Mapping of topics to material filenames
        """
        # Create material summaries (limit content for LLM)
        material_summaries = [
            {
                'filename': mat['filename'],
                'preview': mat['content'][:2000]
            }
            for mat in materials
        ]
        
        # Configure model without structured schema (causing issues)
        model = genai.GenerativeModel(
            settings.GEMINI_MODEL,
            generation_config={
                "response_mime_type": "application/json"
            }
        )
        
        # Build prompt with clear JSON format instructions
        prompt = PromptTemplates.material_mapping(
            topic_paths=topic_paths,
            material_summaries=material_summaries
        )
        prompt += "\n\nReturn your response as a JSON object where keys are topic names and values are arrays of relevant filenames."
        
        # Generate content
        response = model.generate_content(prompt)
        try:
            mapping = json.loads(response.text)
        except json.JSONDecodeError:
            # Fallback: access structured response directly
            mapping = response.candidates[0].content.parts[0].text
            if isinstance(mapping, str):
                mapping = json.loads(mapping)
        
        # Validate mapping
        return self._validate_material_mapping(
            mapping,
            topic_paths,
            [m['filename'] for m in materials]
        )
    
    def generate_flashcards(
        self,
        course_name: str,
        course_content: str,
        num_cards: int,
        style: str,
        answer_format: str
    ) -> List[Dict[str, str]]:
        """
        Generate flashcards using AI.
        
        Args:
            course_name: Name of the course
            course_content: Course content
            num_cards: Number of flashcards to generate
            style: Flashcard style (concise/detailed)
            answer_format: Answer format (short/detailed)
            
        Returns:
            List of flashcards with question and answer
        """
        # Configure model
        model = genai.GenerativeModel(
            settings.GEMINI_MODEL,
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "cards": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "question": {"type": "string"},
                                    "answer": {"type": "string"}
                                },
                                "required": ["question", "answer"]
                            }
                        }
                    },
                    "required": ["cards"]
                }
            }
        )
        
        # Build prompt
        prompt = PromptTemplates.flashcard_generation(
            course_name=course_name,
            course_content=course_content,
            num_cards=num_cards,
            style=style,
            answer_format=answer_format
        )
        
        # Generate content
        response = model.generate_content(prompt)
        try:
            flashcard_data = json.loads(response.text)
        except json.JSONDecodeError:
            # Fallback: access structured response directly
            flashcard_data = response.candidates[0].content.parts[0].text
            if isinstance(flashcard_data, str):
                flashcard_data = json.loads(flashcard_data)
        
        return flashcard_data.get("cards", [])
    
    @staticmethod
    def _get_test_schema() -> Dict[str, Any]:
        """Get JSON schema for test generation."""
        return {
            "type": "object",
            "properties": {
                "questions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "question_number": {"type": "integer"},
                            "question_text": {"type": "string"},
                            "options": {
                                "type": "object",
                                "properties": {
                                    "A": {"type": "string"},
                                    "B": {"type": "string"},
                                    "C": {"type": "string"},
                                    "D": {"type": "string"}
                                },
                                "required": ["A", "B", "C", "D"]
                            },
                            "correct_answer": {"type": "string"},
                            "explanation": {"type": "string"}
                        },
                        "required": ["question_number", "question_text", "options", "correct_answer"]
                    }
                }
            },
            "required": ["questions"]
        }
    
    @staticmethod
    def _validate_material_mapping(
        mapping: Dict[str, List[str]],
        valid_topics: List[str],
        valid_filenames: List[str]
    ) -> Dict[str, List[str]]:
        """Validate and clean material mapping."""
        validated_mapping = {}
        
        for topic, filenames in mapping.items():
            # Only include topics that exist in the course outline
            if topic in valid_topics:
                # Only include filenames that exist in materials
                valid_files = [f for f in filenames if f in valid_filenames]
                if valid_files:
                    validated_mapping[topic] = valid_files
        
        return validated_mapping
