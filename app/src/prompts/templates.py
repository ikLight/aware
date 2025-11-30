"""LLM prompt templates for various AI operations."""


class PromptTemplates:
    """Centralized prompt templates for LLM operations."""
    
    # ========================================================================
    # Test Generation Prompts
    # ========================================================================
    
    @staticmethod
    def test_generation(
        topic: str,
        topic_content: str,
        proficiency_level: str,
        num_questions: int
    ) -> str:
        """Generate prompt for MCQ test generation."""
        difficulty_instructions = {
            "beginner": "Focus on basic concepts, definitions, and simple applications",
            "intermediate": "Include application problems, analysis, and connections between concepts",
            "advanced": "Include complex scenarios, critical thinking, and synthesis of multiple concepts"
        }
        
        instruction = difficulty_instructions.get(proficiency_level, difficulty_instructions["intermediate"])
        
        return f"""You are an expert educational assessment creator. Generate a personalized multiple-choice test based on the following information:

**Topic**: {topic}
**Student Proficiency Level**: {proficiency_level}
**Number of Questions**: {num_questions}

**Topic Content/Material**:
{topic_content}

**Instructions**:
1. Generate exactly {num_questions} multiple-choice questions that test understanding of the topic.
2. Tailor the difficulty to the student's proficiency level:
   - {instruction}
3. Each question must have exactly 4 options (A, B, C, D).
4. Clearly indicate the correct answer for each question.
5. Ensure questions cover different aspects of the topic material.

**Output Format**:
Return a JSON object with this structure:
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

Generate the test now."""
    
    @staticmethod
    def personalized_test_generation(
        topic: str,
        material_content: str,
        proficiency_level: str,
        weak_topics: list = None,
        num_questions: int = 10
    ) -> str:
        """Generate prompt for personalized MCQ test generation from materials."""
        difficulty_instructions = {
            "beginner": "Focus on basic concepts, definitions, and simple applications from the materials",
            "intermediate": "Include application problems, analysis, and connections between concepts from the materials",
            "advanced": "Include complex scenarios, critical thinking, and synthesis of multiple concepts from the materials"
        }
        
        instruction = difficulty_instructions.get(proficiency_level, difficulty_instructions["intermediate"])
        
        # Add personalization context
        personalization = ""
        if weak_topics and len(weak_topics) > 0:
            weak_list = ", ".join([f"{t['topic']} (avg: {t['avg_score']:.1f}%)" for t in weak_topics[:3]])
            personalization = f"""
**Personalization Context**:
The student has shown difficulty with the following topics: {weak_list}
Include 2-3 questions that reinforce foundational concepts related to these weak areas, helping the student build confidence and understanding.
"""
        
        return f"""You are an expert educational assessment creator. Generate a personalized multiple-choice test based on the uploaded course materials.

**Topic**: {topic}
**Student Proficiency Level**: {proficiency_level}
**Number of Questions**: {num_questions}
{personalization}

**Course Materials Content**:
{material_content[:8000]}  

**Instructions**:
1. Generate exactly {num_questions} multiple-choice questions DIRECTLY based on the course materials provided above.
2. Questions should test comprehension, application, and analysis of the specific content in the materials.
3. Tailor the difficulty to the student's proficiency level:
   - {instruction}
4. Each question must have exactly 4 options (A, B, C, D).
5. Clearly indicate the correct answer for each question.
6. Ensure questions cover different sections/aspects of the materials.
7. Make questions specific to the actual content - reference examples, concepts, or details from the materials.
8. If personalization context is provided, strategically include questions that address weak areas while maintaining appropriate difficulty.

**Output Format**:
Return a JSON object with this structure:
{{
  "questions": [
    {{
      "question_number": 1,
      "question_text": "Based on the materials, what is...",
      "options": {{
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      }},
      "correct_answer": "A",
      "explanation": "Brief explanation referencing the materials"
    }}
  ]
}}

Generate the personalized test now."""
    
    # ========================================================================
    # Course Report Prompts
    # ========================================================================
    
    @staticmethod
    def course_report(
        course_name: str,
        total_enrolled: int,
        students_with_tests: int,
        participation_rate: float,
        class_average: float,
        proficiency_distribution: dict,
        topic_summary: list
    ) -> str:
        """Generate prompt for AI course report."""
        prompt = f"""You are an expert educational analyst. Generate a concise course performance overview based on the following data:

COURSE: {course_name}
TOTAL ENROLLED STUDENTS: {total_enrolled}
STUDENTS WITH TEST DATA: {students_with_tests} ({participation_rate:.1f}% participation)
CLASS AVERAGE SCORE: {class_average:.2f}%

PROFICIENCY DISTRIBUTION:
- Beginner: {proficiency_distribution['beginner']} students
- Intermediate: {proficiency_distribution['intermediate']} students
- Advanced: {proficiency_distribution['advanced']} students

TOPIC PERFORMANCE:
"""
        
        for topic in topic_summary:
            prompt += f"\n{topic['topic']}:\n"
            prompt += f"  - Average Score: {topic['average_score']}%\n"
            prompt += f"  - Test Attempts: {topic['attempts']}\n"
            prompt += f"  - Students Tested: {topic['students_tested']}\n"
            prompt += f"  - Score Range: {topic['lowest_score']}% to {topic['highest_score']}%\n"
        
        prompt += """

Generate a CONCISE report with EXACTLY these three sections. Keep it brief - this is an overview only. The professor can dive deeper into individual student performance separately.

## Overall Class Performance
- Brief summary of class participation and engagement
- Class average score and what it indicates
- Proficiency level distribution overview (are students progressing?)

## Topic-wise Analysis
- Topics where students are excelling (highest scores)
- Topics where students are struggling (lowest scores)
- One or two key insights about topic performance patterns

## Conclusion
- 2-3 key takeaways for the professor
- Brief actionable next steps

Keep the entire report under 300 words. Be data-driven but concise. Use bullet points for clarity.
"""
        return prompt
    
    # ========================================================================
    # Material Mapping Prompts
    # ========================================================================
    
    @staticmethod
    def material_mapping(
        topic_paths: list,
        material_summaries: list
    ) -> str:
        """Generate prompt for mapping materials to topics."""
        import json
        
        return f"""You are an expert educational content analyzer. Your task is to map course materials to their corresponding topics in a course outline.

Course Topics:
{json.dumps(topic_paths, indent=2)}

Course Materials (with content previews):
{json.dumps(material_summaries, indent=2)}

Analyze each material and determine which topic(s) it best corresponds to. A material can map to multiple topics if it covers multiple subjects.

Return your response as a JSON object where:
- Keys are topic paths from the course outline (e.g., "Data Structures/Arrays/Introduction")
- Values are arrays of material filenames that belong to that topic

Example format:
{{
  "Data Structures/Arrays/Introduction": ["arrays_lecture.pdf", "arrays_intro.pptx"],
  "Data Structures/Linked Lists/Basics": ["linkedlist.pdf"]
}}

Important:
- Only use topic paths that exist in the course outline
- Be specific - map to the most specific/deepest topic level that applies
- If a material covers multiple topics, include it in all relevant topics
- If unsure, map to the parent topic rather than guessing a subtopic

Return ONLY the JSON object, no additional text."""
    
    # ========================================================================
    # Flashcard Generation Prompts
    # ========================================================================
    
    @staticmethod
    def flashcard_generation(
        course_name: str,
        course_content: str,
        num_cards: int,
        style: str,
        answer_format: str
    ) -> str:
        """Generate prompt for flashcard creation."""
        style_instruction = "concise and focused" if style == "concise" else "detailed and comprehensive"
        answer_instruction = "brief and to the point" if answer_format == "short" else "detailed with explanations"
        
        return f"""Based on the following course content, generate {num_cards} flashcards for review.

Course: {course_name}
Content: {course_content}

Style: {style}
Answer Format: {answer_format}

Generate flashcards in JSON format with the following structure:
{{
  "cards": [
    {{
      "question": "Front of card - the question or prompt",
      "answer": "Back of card - the answer or explanation"
    }}
  ]
}}

Make the flashcards {style_instruction}.
Make the answers {answer_instruction}."""
