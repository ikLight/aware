import os
import json
import google.generativeai as genai
from typing import Dict, Any, List
from pathlib import Path

# Configure Gemini API
genai.configure(api_key="AIzaSyBrJY7hXD90HOKHas7txAYQtapvyG_Ea6w")
MODEL_NAME = "models/gemini-pro"

class StudyPlan:
    """
    Generates personalized study plans using the Gemini API based on course materials
    and student proficiency.
    """
    def __init__(self, proficiency_path: str | Path, course_material_path: str | Path):
        """
        Initialize the StudyPlan generator.
        
        Args:
            proficiency_path: Path to the student proficiency JSON file
            course_material_path: Path to the course material JSON file
        """
        # Convert string paths to Path objects
        self._proficiency_path = Path(proficiency_path)
        self._course_material_path = Path(course_material_path)
        
        # Load proficiency data
        if not self._proficiency_path.exists():
            raise FileNotFoundError(f"Proficiency file not found: {proficiency_path}")
            
        with open(self._proficiency_path) as f:
            proficiency_data = json.load(f)
            self._proficiency = proficiency_data.get("proficiency_level", "intermediate")
            self._topic_proficiencies = proficiency_data.get("topics", {})
            
        # Load course material
        if not self._course_material_path.exists():
            raise FileNotFoundError(f"Course material file not found: {course_material_path}")
            
        with open(self._course_material_path) as f:
            self._course_material = json.load(f)
            
        # Initialize Gemini model
        self._model = genai.GenerativeModel(MODEL_NAME)
    
    def _get_topicwise_plan_prompt(self, topic: str, content: str, topic_proficiency: str) -> str:
        """Generate a prompt for creating a study plan for a specific topic."""
        return f"""
        Create a detailed study plan for the following topic based on the student's current knowledge level.
        
        Topic: {topic}
        Content: {content}
        Student's Overall Proficiency: {self._proficiency}
        Topic-Specific Proficiency: {topic_proficiency}
        
        Create a study plan that:
        1. Is tailored to the student's current proficiency level
        2. Breaks down complex concepts into manageable steps
        3. Includes specific learning activities and resources
        4. Sets clear learning objectives
        5. Estimates time requirements
        6. Suggests practice exercises
        
        Format the plan as a clear, structured text with sections.
        Focus only on practical, actionable steps.
        """
    
    def _get_final_plan_prompt(self, topic_plans: List[Dict[str, str]]) -> str:
        """Generate a prompt for creating the final consolidated study plan."""
        return f"""
        Create a comprehensive study plan by organizing and prioritizing the following topic-specific plans.
        The student's overall proficiency level is: {self._proficiency}

        Topic Plans:
        {json.dumps(topic_plans, indent=2)}

        Create a final study plan that:
        1. Organizes topics in a logical learning sequence
        2. Highlights dependencies between topics
        3. Suggests an overall timeline
        4. Includes milestones and checkpoints
        5. Recommends review intervals
        6. Provides progress tracking methods

        Return a structured, actionable study plan that a student can follow easily.
        Include specific time estimates and learning objectives for each section.
        """
    def create_study_plan(self) -> Dict[str, Any]:
        """
        Generate a personalized study plan based on course materials and student proficiency.
        
        Returns:
            Dictionary containing the structured study plan
        """
        print("🎯 Generating topic-specific study plans...")
        topic_plans = []
        
        try:
            # Generate plans for each topic
            for topic in self._course_material.get("topics", []):
                topic_content = self._course_material.get(topic, "")
                topic_proficiency = self._topic_proficiencies.get(topic, self._proficiency)
                
                print(f"📚 Processing topic: {topic}")
                topic_prompt = self._get_topicwise_plan_prompt(topic, topic_content, topic_proficiency)
                
                response = self._model.generate_content(topic_prompt)
                if response.parts:
                    topic_plans.append({
                        "topic": topic,
                        "proficiency": topic_proficiency,
                        "plan": response.text
                    })
            
            print(f"✅ Generated plans for {len(topic_plans)} topics")
            
            # Create final consolidated plan
            print("🔄 Creating final consolidated study plan...")
            final_prompt = self._get_final_plan_prompt(topic_plans)
            final_response = self._model.generate_content(final_prompt)
            
            if not final_response.parts:
                raise ValueError("Failed to generate final study plan")
                
            return {
                "overall_proficiency": self._proficiency,
                "topic_plans": topic_plans,
                "final_plan": final_response.text
            }
            
        except Exception as e:
            print(f"❌ Error generating study plan: {str(e)}")
            raise

##------------------- END OF StudyPlan -------------------##



    
         