import os
import json
import pathlib
import google.generativeai as genai
from typing import List, Dict, Any

# Set up gemini configuration
try:
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
except KeyError:
    print("Error: GOOGLE_API_KEY environment variable not set.")

MODEL_NAME = "models/gemini-2.5-flash"

PROMPT = """
You are an expert instructional designer creating a knowledge graph from a set of course documents. Analyze the content of all the attached files to create a single, unified knowledge graph, synthesizing the information across all documents.

Your output must be a single JSON object with two keys: "nodes" and "edges".

1.  The "nodes" key must have a value that is a list of strings, where each string is a core concept, skill, or topic found in the documents.
2.  The "edges" key must have a value that is a list of objects. Each object must represent a relationship and have three keys: "source" (the starting concept), "target" (the ending concept), and "relationship" (a string describing the connection, like 'is_prerequisite_for' or 'is_an_example_of').

Ensure that the 'source' and 'target' concepts in the 'nodes' list are present in the 'nodes' list.
"""

def parse_course_materials(file_paths: List[str]) -> Dict[str, Any]:
    """
    Generate a knowledge graph from the provided files using Gemini API.
    
    Args:
        file_paths: List of absolute paths to the course material files
        
    Returns:
        Dictionary containing the knowledge graph with 'nodes' and 'edges'
    """
    print(f"🚀 Processing files with model: {MODEL_NAME}")
    
    # Verify files exist
    valid_paths = []
    for path in file_paths:
        if os.path.exists(path):
            valid_paths.append(path)
        else:
            print(f"Warning: File not found - {path}")
    
    if not valid_paths:
        raise ValueError("No valid files provided")

    # Upload files to Gemini
    print(f"Uploading {len(valid_paths)} files to Gemini API...")
    gemini_files = []
    for path in valid_paths:
        try:
            uploaded_file = genai.upload_file(path=path)
            gemini_files.append(uploaded_file)
        except Exception as e:
            print(f"Failed to upload {path}. Error: {e}")
            continue
    
    if not gemini_files:
        raise ValueError("No files were successfully uploaded")
        
    print(f"✅ Successfully uploaded {len(gemini_files)} files")

    # Generate knowledge graph
    print("🧠 Generating knowledge graph...")
    model = genai.GenerativeModel(model_name=MODEL_NAME)
    request = [PROMPT] + gemini_files
    
    try:
        response = model.generate_content(request, request_options={'timeout': 600})
        json_str = response.text.strip().replace("```json", "").replace("```", "")
        graph_data = json.loads(json_str)
        
        print(f"✨ Successfully generated knowledge graph")
        print(f"   Nodes found: {len(graph_data.get('nodes', []))}")
        print(f"   Edges found: {len(graph_data.get('edges', []))}")
        
        return graph_data

    except Exception as e:
        print(f"❌ An error occurred during processing: {e}")
        if 'response' in locals() and hasattr(response, 'text'):
            print(f"Raw Model Response: {response.text}")
        raise

def convert_to_course_material(graph_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert the knowledge graph into the course material format expected by the test generator.
    """
    # Extract topics from nodes
    topics = graph_data['nodes']
    
    # Create course material dictionary
    course_material = {
        "topics": topics
    }
    
    # Add content for each topic based on its relationships
    for topic in topics:
        # Find all relationships where this topic is the source
        related_content = [
            f"{edge['relationship']} {edge['target']}"
            for edge in graph_data['edges']
            if edge['source'] == topic
        ]
        
        # Join the relationships into a content string
        content = f"Topic: {topic}\n"
        if related_content:
            content += "Related concepts:\n" + "\n".join(related_content)
        else:
            content += "Standalone concept with no direct relationships."
        
        course_material[topic] = content
    
    return course_material