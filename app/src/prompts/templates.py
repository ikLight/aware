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
        prompt = f"""You are an expert educational analyst. Generate a comprehensive course performance report based on the following data:

COURSE: {course_name}
TOTAL ENROLLED STUDENTS: {total_enrolled}
STUDENTS WITH TEST DATA: {students_with_tests} ({participation_rate:.1f}% participation)
CLASS AVERAGE SCORE: {class_average:.2f}%

PROFICIENCY DISTRIBUTION:
- Beginner: {proficiency_distribution['beginner']} students
- Intermediate: {proficiency_distribution['intermediate']} students
- Advanced: {proficiency_distribution['advanced']} students

TOPIC PERFORMANCE (sorted by difficulty):
"""
        
        for topic in topic_summary:
            prompt += f"\n{topic['topic']}:\n"
            prompt += f"  - Average Score: {topic['average_score']}%\n"
            prompt += f"  - Test Attempts: {topic['attempts']}\n"
            prompt += f"  - Students Tested: {topic['students_tested']}\n"
            prompt += f"  - Score Range: {topic['lowest_score']}% to {topic['highest_score']}%\n"
        
        prompt += """

Please provide a detailed report that includes:

1. OVERALL CLASS PERFORMANCE SUMMARY
   - General assessment of how the class is performing
   - Participation and engagement levels
   - Overall trends in student performance

2. TOPIC-SPECIFIC ANALYSIS
   - Identify topics where students are excelling
   - Identify topics where students are struggling
   - Provide insights into why certain topics might be challenging

3. PROFICIENCY INSIGHTS
   - Analysis of the proficiency distribution
   - Whether students are progressing appropriately
   - Recommendations for proficiency-based interventions

4. ACTIONABLE RECOMMENDATIONS
   - Specific teaching strategies to address struggling topics
   - Suggestions for additional resources or review sessions
   - Ideas for differentiated instruction based on proficiency levels
   - Recommendations for students who haven't participated yet

5. STRENGTHS AND OPPORTUNITIES
   - Highlight what's working well in the course
   - Identify opportunities for improvement

Format the report in a professional, clear manner with proper sections and bullet points. Be specific and data-driven in your analysis. The report should be comprehensive but concise (aim for 500-800 words).
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
