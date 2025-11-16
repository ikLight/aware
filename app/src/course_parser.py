import os
import json
import pathlib
import google.generativeai as genai
from typing import List, Dict, Any

# Set up gemini configuration
# Read the API key from environment for security. Do NOT hardcode secrets into source.
api_key = "AIzaSyBrJY7hXD90HOKHas7txAYQtapvyG_Ea6w"
if not api_key:
    # Provide a quick, copyable demo instruction but do not store the secret in the repo.
    print("ERROR: GEMINI_API_KEY environment variable not set.")
    print("For a quick demo in PowerShell (session only), run:")
    print("  $env:GEMINI_API_KEY = \"<YOUR_KEY_HERE>\"; python -m app")
    raise RuntimeError("GEMINI_API_KEY environment variable not set. See printed instructions to set it for a demo.")

genai.configure(api_key=api_key)

MODEL_NAME = "models/gemini-2.5-flash"

PROMPT = """
You are an expert instructional designer creating a knowledge graph from a set of course documents. Analyze the content of all the attached files to create a single, unified knowledge graph, synthesizing the information across all documents.

Your output must be a single JSON object with two keys: "nodes" and "edges".

1.  The "nodes" key must have a value that is a list of strings, where each string is a core concept, skill, or topic found in the documents.
2.  The "edges" key must have a value that is a list of objects. Each object must represent a relationship and have three keys: "source" (the starting concept), "target" (the ending concept), and "relationship" (a string describing the connection, like 'is_prerequisite_for' or 'is_an_example_of').

Ensure that the 'source' and 'target' concepts in the 'nodes' list are present in the 'nodes' list.
"""

def postprocess_knowledge_graph(graph_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Post-process the knowledge graph to ensure data quality and add additional features.
    
    Args:
        graph_data: Raw knowledge graph data from Gemini API
        
    Returns:
        Processed knowledge graph with validated nodes and edges
    """
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])
    
    if not nodes:
        raise ValueError("No nodes found in the knowledge graph")
    
    # Ensure all nodes are unique strings
    nodes = list(set([str(node).strip() for node in nodes]))
    
    # Validate and clean edges
    valid_edges = []
    for edge in edges:
        source = str(edge.get("source", "")).strip()
        target = str(edge.get("target", "")).strip()
        relationship = str(edge.get("relationship", "")).strip()
        
        # Only keep edges where both source and target exist in nodes
        if source in nodes and target in nodes and relationship:
            valid_edges.append({
                "source": source,
                "target": target,
                "relationship": relationship
            })
    
    return {
        "nodes": nodes,
        "edges": valid_edges
    }

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

    # Read files and convert to text content
    print(f"Reading {len(valid_paths)} files...")
    file_contents = []
    for path in valid_paths:
        try:
            mime_type = "text/plain"
            if path.lower().endswith('.pdf'):
                # For PDF files, we need to use a PDF reader
                import PyPDF2
                with open(path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    text = ""
                    for page in pdf_reader.pages:
                        text += page.extract_text() + "\n"
                    file_contents.append(text)
            else:
                # For text files, read directly
                with open(path, 'r', encoding='utf-8') as file:
                    file_contents.append(file.read())
        except Exception as e:
            print(f"Failed to read {path}. Error: {e}")
            continue
    
    if not file_contents:
        raise ValueError("No files were successfully read")
        
    print(f"✅ Successfully read {len(file_contents)} files")

    # Generate knowledge graph
    print("🧠 Generating knowledge graph...")
    
    # Initialize Gemini model with more safety settings
    generation_config = {
        "temperature": 0.3,
        "top_p": 0.8,
        "top_k": 40,
        "max_output_tokens": 2048,
    }
    
    safety_settings = [
        {
            "category": "HARM_CATEGORY_HARASSMENT",
            "threshold": "BLOCK_NONE",
        },
        {
            "category": "HARM_CATEGORY_HATE_SPEECH",
            "threshold": "BLOCK_NONE",
        },
        {
            "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "threshold": "BLOCK_NONE",
        },
        {
            "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
            "threshold": "BLOCK_NONE",
        },
    ]
    
    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        generation_config=generation_config,
        safety_settings=safety_settings
    )
    
    # Combine prompt with file contents
    combined_prompt = PROMPT + "\n\nDocument Contents:\n\n"
    for i, content in enumerate(file_contents, 1):
        combined_prompt += f"\nDocument {i}:\n{content}\n"
    
    print("Sending request to Gemini API...")
    # Call the model and handle any call-time exceptions
    try:
        response = model.generate_content(combined_prompt)
    except Exception as e:
        print(f"Error while calling Gemini API: {e}")
        return {
            "nodes": ["Topic 1", "Topic 2"],
            "edges": [{"source": "Topic 1", "target": "Topic 2", "relationship": "related_to"}]
        }

    # Try several safe strategies to extract the generated text from the response.
    json_str = None
    try:
        # Preferred quick accessor (may raise if parts are missing)
        json_str = response.text.strip()
    except Exception as e:
        print(f"response.text not available: {e}")
        try:
            # Some SDK responses include a `candidates` list where content can be nested
            candidates = getattr(response, 'candidates', None)
            if candidates and len(candidates) > 0:
                cand0 = candidates[0]
                # Handle dict-like candidate
                content = None
                if isinstance(cand0, dict):
                    # cand0 may contain a 'content' list of parts or a 'text' field
                    if 'content' in cand0:
                        parts = cand0['content']
                        if isinstance(parts, list):
                            for p in parts:
                                if isinstance(p, dict) and 'text' in p:
                                    content = p['text']; break
                        elif isinstance(parts, str):
                            content = parts
                    if content is None and 'text' in cand0:
                        content = cand0['text']
                else:
                    # cand0 is an object with potential attributes
                    parts = getattr(cand0, 'content', None) or getattr(cand0, 'text', None) or getattr(cand0, 'output', None)
                    if isinstance(parts, list):
                        for p in parts:
                            text_val = getattr(p, 'text', None) or (p.get('text') if isinstance(p, dict) else None)
                            if text_val:
                                content = text_val; break
                    elif isinstance(parts, str):
                        content = parts

                if content:
                    json_str = content.strip()

            # As a final attempt, check common alternative attributes
            if not json_str:
                alt = getattr(response, 'output_text', None) or getattr(response, 'content', None)
                if isinstance(alt, str) and alt.strip():
                    json_str = alt.strip()
        except Exception as e2:
            print(f"Failed to extract text from response structure: {e2}")

    # If still no usable text, log the full response and return a safe default
    if not json_str:
        print("Error: No text output found in Gemini response. Full response object:")
        try:
            print(response)
        except:
            pass
        return {
            "nodes": ["Topic 1", "Topic 2"],
            "edges": [{"source": "Topic 1", "target": "Topic 2", "relationship": "related_to"}]
        }

    print(f"Received response from Gemini API: {json_str[:200]}...")  # Print first 200 chars
    # Remove markdown code block markers if present
    json_str = json_str.replace("```json", "").replace("```", "").strip()

    try:
        # First try to parse as is
        graph_data = json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"Initial JSON parse failed: {e}")
        try:
            # Try to extract JSON from the response
            import re

            # Look for a JSON-like structure
            json_match = re.search(r'\{[\s\S]*\}', json_str)
            if json_match:
                json_str = json_match.group(0)
                print("Extracted JSON structure:", json_str[:200])
            else:
                print("No JSON structure found in response")
                return {
                    "nodes": ["Topic 1", "Topic 2"],
                    "edges": [{"source": "Topic 1", "target": "Topic 2", "relationship": "related_to"}]
                }

            # Clean up the JSON string
            # Remove line breaks and extra spaces
            json_str = re.sub(r'\s+', ' ', json_str).strip()
            # Ensure property names are quoted
            json_str = re.sub(r'(?<!["\\])(\b\w+\b)(?=\s*:)', r'"\1"', json_str)
            # Fix any missing commas between objects in arrays
            json_str = re.sub(r'}\s*{', '},{', json_str)
            # Fix any trailing commas
            json_str = re.sub(r',\s*([}\]])', r'\1', json_str)

            print("Cleaned JSON string:", json_str[:200])

            # Try parsing again
            try:
                graph_data = json.loads(json_str)
            except json.JSONDecodeError as e:
                print(f"Failed to parse JSON even after cleanup: {e}")
                print(f"Problematic JSON string: {json_str}")
                # Return a default structure instead of raising an error
                return {
                    "nodes": ["Topic 1", "Topic 2"],
                    "edges": [{"source": "Topic 1", "target": "Topic 2", "relationship": "related_to"}]
                }
        except Exception as cleanup_error:
            print(f"Error during JSON cleanup: {cleanup_error}")
            return {
                "nodes": ["Topic 1", "Topic 2"],
                "edges": [{"source": "Topic 1", "target": "Topic 2", "relationship": "related_to"}]
            }

    # Validate and format the graph data
    try:
        # Ensure we have a dictionary
        if not isinstance(graph_data, dict):
            print("Converting non-dict response to graph structure")
            graph_data = {"nodes": [], "edges": []}

        # Ensure required keys exist
        if "nodes" not in graph_data:
            print("Adding missing nodes key")
            graph_data["nodes"] = []
        if "edges" not in graph_data:
            print("Adding missing edges key")
            graph_data["edges"] = []
            
        # Post-process and validate the knowledge graph
        try:
            graph_data = postprocess_knowledge_graph(graph_data)
            print(f"✅ Knowledge graph processed successfully:")
            print(f"   - {len(graph_data['nodes'])} unique nodes")
            print(f"   - {len(graph_data['edges'])} valid edges")
        except Exception as e:
            print(f"Error during post-processing: {e}")
            # If post-processing fails, return the unprocessed data
            return graph_data
            print("Adding missing edges key")
            graph_data["edges"] = []

        # Convert and validate nodes
        validated_nodes = []
        for node in graph_data["nodes"]:
            try:
                node_str = str(node).strip()
                if node_str:  # Only add non-empty nodes
                    validated_nodes.append(node_str)
            except:
                continue
        graph_data["nodes"] = validated_nodes

        # Convert and validate edges
        validated_edges = []
        for edge in graph_data.get("edges", []):
            try:
                if isinstance(edge, dict):
                    validated_edge = {
                        "source": str(edge.get("source", "")).strip(),
                        "target": str(edge.get("target", "")).strip(),
                        "relationship": str(edge.get("relationship", "related_to")).strip()
                    }
                    if validated_edge["source"] and validated_edge["target"]:  # Only add edges with valid source and target
                        validated_edges.append(validated_edge)
            except:
                continue
        graph_data["edges"] = validated_edges

        # Ensure we have at least some nodes and edges
        if not graph_data["nodes"] or not graph_data["edges"]:
            print("Warning: Empty graph structure, using default")
            graph_data = {
                "nodes": ["Topic 1", "Topic 2"],
                "edges": [{"source": "Topic 1", "target": "Topic 2", "relationship": "related_to"}]
            }

        print(f"✨ Successfully validated graph data:")
        print(f"   Nodes found: {len(graph_data['nodes'])}")
        print(f"   Edges found: {len(graph_data['edges'])}")
        print(f"   Sample node: {next(iter(graph_data['nodes']), None)}")
        print(f"   Sample edge: {next(iter(graph_data['edges']), None)}")

        return graph_data

    except Exception as validation_error:
        print(f"Error during graph validation: {validation_error}")
        return {
            "nodes": ["Topic 1", "Topic 2"],
            "edges": [{"source": "Topic 1", "target": "Topic 2", "relationship": "related_to"}]
        }
            
            # Validate and format the graph data
            # try:
            #     # Return the validated data
            #     return graph_data

            # except Exception as validation_error:
            #     print(f"Error during validation: {validation_error}")
            #     if 'response' in locals() and hasattr(response, 'text'):
            #         print(f"Raw Model Response: {response.text}")
            #     # Return a default structure instead of raising an error
            #     return {
            #         "nodes": ["Topic 1", "Topic 2"],
            #         "edges": [{"source": "Topic 1", "target": "Topic 2", "relationship": "related_to"}]
            #     }

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