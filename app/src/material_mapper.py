import json
import os
import google.generativeai as genai
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not set.")

genai.configure(api_key=api_key)

def map_materials_to_topics(
    course_plan: Dict[str, Any],
    materials: List[Dict[str, str]]
) -> Dict[str, List[str]]:
    """
    Use LLM to map course materials to topics in the course outline.
    
    Args:
        course_plan: The course plan JSON with topics and subtopics
        materials: List of dicts with 'filename' and 'content' keys
        
    Returns:
        Dict mapping topic paths to list of material filenames
        Example: {"Arrays/Introduction": ["lecture1.pdf", "arrays_intro.pptx"]}
    """
    
    # Extract all topic paths from course plan
    topic_paths = extract_topic_paths(course_plan)
    
    # Create material summaries (limit content length for LLM)
    material_summaries = []
    for mat in materials:
        content_preview = mat['content'][:2000]  # First 2000 chars
        material_summaries.append({
            'filename': mat['filename'],
            'preview': content_preview
        })
    
    # Build prompt for LLM
    prompt = f"""You are an expert educational content analyzer. Your task is to map course materials to their corresponding topics in a course outline.

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

Return ONLY the JSON object, no additional text.
"""
    
    try:
        # Configure model for structured JSON response
        model = genai.GenerativeModel(
            'gemini-2.0-flash-exp',
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "object",
                    "description": "Mapping of course topics to material filenames",
                    "additionalProperties": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                }
            }
        )
        
        response = model.generate_content(prompt)
        
        # Parse the structured JSON response directly
        mapping = json.loads(response.text)
        
        # Validate the mapping
        validated_mapping = validate_mapping(mapping, topic_paths, [m['filename'] for m in materials])
        
        return validated_mapping
        
    except Exception as e:
        print(f"Error in LLM mapping: {e}")
        # Fallback: create a simple mapping based on filename matching
        return fallback_mapping(topic_paths, materials)


def extract_topic_paths(course_plan: Dict[str, Any], prefix: str = "") -> List[str]:
    """
    Recursively extract all topic paths from course plan.
    
    Returns list like:
    ["Arrays", "Arrays/Introduction", "Arrays/Operations", "Linked Lists", ...]
    """
    paths = []
    
    if isinstance(course_plan, dict):
        for key, value in course_plan.items():
            if key in ['topics', 'subtopics', 'sub_topics']:
                if isinstance(value, list):
                    for topic in value:
                        if isinstance(topic, dict) and 'name' in topic:
                            topic_name = topic['name']
                            current_path = f"{prefix}/{topic_name}" if prefix else topic_name
                            paths.append(current_path)
                            
                            # Recursively get subtopics
                            if 'subtopics' in topic or 'sub_topics' in topic:
                                subtopic_key = 'subtopics' if 'subtopics' in topic else 'sub_topics'
                                sub_paths = extract_topic_paths(
                                    {key: topic[subtopic_key]},
                                    current_path
                                )
                                paths.extend(sub_paths)
            else:
                # Recursively search other dict values
                sub_paths = extract_topic_paths(value, prefix)
                paths.extend(sub_paths)
    elif isinstance(course_plan, list):
        for item in course_plan:
            sub_paths = extract_topic_paths(item, prefix)
            paths.extend(sub_paths)
    
    return paths


def validate_mapping(
    mapping: Dict[str, List[str]],
    valid_topics: List[str],
    valid_filenames: List[str]
) -> Dict[str, List[str]]:
    """Validate and clean the LLM-generated mapping."""
    validated = {}
    
    for topic, files in mapping.items():
        # Check if topic exists in course outline
        if topic in valid_topics:
            # Filter to only valid filenames
            valid_files = [f for f in files if f in valid_filenames]
            if valid_files:
                validated[topic] = valid_files
    
    return validated


def fallback_mapping(
    topic_paths: List[str],
    materials: List[Dict[str, str]]
) -> Dict[str, List[str]]:
    """
    Simple fallback mapping based on keyword matching in filenames.
    Used if LLM mapping fails.
    """
    mapping = {}
    
    for topic_path in topic_paths:
        # Get the most specific topic name
        topic_name = topic_path.split('/')[-1].lower()
        topic_keywords = topic_name.split()
        
        matched_files = []
        for mat in materials:
            filename_lower = mat['filename'].lower()
            # Check if any topic keyword appears in filename
            if any(keyword in filename_lower for keyword in topic_keywords):
                matched_files.append(mat['filename'])
        
        if matched_files:
            mapping[topic_path] = matched_files
    
    return mapping


def extract_material_content(file_path: str) -> str:
    """
    Extract text content from a material file (PDF or PPTX).
    """
    from .file_processor import extract_text_from_pdf, extract_text_from_pptx
    import os
    
    ext = os.path.splitext(file_path)[1].lower()
    
    try:
        if ext == '.pdf':
            return extract_text_from_pdf(file_path)
        elif ext in ['.ppt', '.pptx']:
            return extract_text_from_pptx(file_path)
        else:
            return ""
    except Exception as e:
        print(f"Error extracting content from {file_path}: {e}")
        return ""
