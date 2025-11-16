"""
AI-powered test generator using Google Gemini API.
Generates personalized MCQ tests based on course topics and student proficiency.
"""

import os
import json
import google.generativeai as genai
from typing import List, Dict, Any

# Configure Gemini API
api_key = "AIzaSyBrJY7hXD90HOKHas7txAYQtapvyG_Ea6w"
if not api_key:
    raise RuntimeError("GEMINI_API_KEY environment variable not set.")

genai.configure(api_key=api_key)
MODEL_NAME = "models/gemini-2.5-flash"


class AITestGenerator:
    """
    Generates personalized MCQ tests using Gemini AI based on course content,
    selected topic, and student proficiency level.
    """
    
    def __init__(self):
        """Initialize the Gemini model."""
        self.model = genai.GenerativeModel(MODEL_NAME)
    
    def _build_test_prompt(
        self,
        topic: str,
        topic_content: str,
        proficiency_level: str,
        num_questions: int = 10
    ) -> str:
        """
        Build the prompt for Gemini to generate MCQ test questions.
        
        Args:
            topic: The topic/week name from course outline
            topic_content: The actual content/material for this topic
            proficiency_level: Student's proficiency (beginner/intermediate/advanced)
            num_questions: Number of questions to generate
            
        Returns:
            Formatted prompt string
        """
        prompt = f"""
You are an expert educational assessment creator. Generate a personalized multiple-choice test based on the following information:

**Topic**: {topic}
**Student Proficiency Level**: {proficiency_level}
**Number of Questions**: {num_questions}

**Topic Content/Material**:
{topic_content}

**Instructions**:
1. Generate exactly {num_questions} multiple-choice questions that test understanding of the topic.
2. Tailor the difficulty to the student's proficiency level:
   - **Beginner**: Focus on basic concepts, definitions, and simple applications
   - **Intermediate**: Include application problems, analysis, and connections between concepts
   - **Advanced**: Include complex scenarios, critical thinking, and synthesis of multiple concepts
3. Each question must have exactly 4 options (A, B, C, D).
4. Clearly indicate the correct answer for each question.
5. Ensure questions cover different aspects of the topic material.

**Output Format**:
Return ONLY a valid JSON object with this exact structure (no markdown formatting, no code blocks):
{{
  "questions": [
    {{
      "question_number": 1,
      "question_text": "What is...",
      "options": {{
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      }},
      "correct_answer": "A",
      "explanation": "Brief explanation of why this is correct"
    }}
  ]
}}

Generate the test now.
"""
        return prompt
    
    def generate_test(
        self,
        topic: str,
        topic_content: str,
        proficiency_level: str = "intermediate",
        num_questions: int = 10
    ) -> Dict[str, Any]:
        """
        Generate a personalized MCQ test using Gemini AI.
        
        Args:
            topic: Topic name from course outline
            topic_content: Actual course material for this topic
            proficiency_level: Student's proficiency (beginner/intermediate/advanced)
            num_questions: Number of questions to generate (default: 10)
            
        Returns:
            Dictionary containing the generated test with questions, options, and answers
            
        Raises:
            Exception: If test generation fails
        """
        try:
            print(f"🤖 Generating {num_questions} MCQ test for topic: {topic}")
            print(f"📊 Student proficiency: {proficiency_level}")
            
            # Build the prompt
            prompt = self._build_test_prompt(topic, topic_content, proficiency_level, num_questions)
            
            # Generate content with Gemini
            print("⏳ Calling Gemini API...")
            response = self.model.generate_content(prompt)
            
            if not response.parts:
                raise ValueError("No response generated from Gemini API")
            
            # Extract text response
            response_text = response.text.strip()
            
            # Clean up response - remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            # Parse JSON response
            test_data = json.loads(response_text)
            
            # Validate structure
            if "questions" not in test_data:
                raise ValueError("Invalid test format: missing 'questions' key")
            
            if len(test_data["questions"]) != num_questions:
                print(f"⚠️  Warning: Expected {num_questions} questions, got {len(test_data['questions'])}")
            
            print(f"✅ Successfully generated {len(test_data['questions'])} questions")
            
            return {
                "topic": topic,
                "proficiency_level": proficiency_level,
                "num_questions": len(test_data["questions"]),
                "questions": test_data["questions"]
            }
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing error: {e}")
            print(f"Response text: {response_text[:500]}")
            raise Exception(f"Failed to parse Gemini response as JSON: {str(e)}")
        except Exception as e:
            print(f"❌ Error generating test: {e}")
            raise Exception(f"Test generation failed: {str(e)}")
