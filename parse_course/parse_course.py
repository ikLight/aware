import os
import json
import pathlib
import google.generativeai as genai

# --- Configuration ---
# Set up your API key via the GOOGLE_API_KEY environment variable.
try:
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
except KeyError:
    print("Error: GOOGLE_API_KEY environment variable not set.")
    exit()

# Define the input folder and output file.
INPUT_DIR = "parse_course/course_materials"
OUTPUT_FILE = "parse_course/knowledge_graph.json"

# Set the model based on current documentation for complex, multi-document tasks.
# 'gemini-2.5-pro-latest' is the most powerful reasoning model.
# 'gemini-2.5-flash-latest' is a balanced option with a large context window.
MODEL_NAME = "models/gemini-2.5-flash"

PROMPT = """
You are an expert instructional designer creating a knowledge graph from a set of course documents. Analyze the content of all the attached files to create a single, unified knowledge graph, synthesizing the information across all documents.

Your output must be a single JSON object with two keys: "nodes" and "edges".

1.  The "nodes" key must have a value that is a list of strings, where each string is a core concept, skill, or topic found in the documents.
2.  The "edges" key must have a value that is a list of objects. Each object must represent a relationship and have three keys: "source" (the starting concept), "target" (the ending concept), and "relationship" (a string describing the connection, like 'is_prerequisite_for' or 'is_an_example_of').

Ensure that the 'source' and 'target' concepts in the 'edges' list are present in the 'nodes' list.
"""

def main():
    """
    Main function to generate the knowledge graph from files in a directory.
    """
    print(f"🚀 Initializing process with model: {MODEL_NAME}")
    input_dir_path = pathlib.Path(INPUT_DIR)

    if not input_dir_path.exists() or not input_dir_path.is_dir():
        print(f"Error: Input directory '{INPUT_DIR}' not found or is not a directory.")
        return

    file_paths = [f for f in input_dir_path.iterdir() if f.is_file()]
    if not file_paths:
        print(f"No files found in '{INPUT_DIR}'.")
        return

    print(f"Found {len(file_paths)} files. Uploading to the Gemini API...")
    gemini_files = []
    for path in file_paths:
        print(f"  Uploading: {path.name}")
        try:
            uploaded_file = genai.upload_file(path=path)
            gemini_files.append(uploaded_file)
        except Exception as e:
            print(f"    Failed to upload {path.name}. Error: {e}")
            continue
    
    if not gemini_files:
        print("No files were successfully uploaded. Exiting.")
        return
        
    print(f"\n✅ Successfully uploaded {len(gemini_files)} files.")

    print("\n🧠 Generating knowledge graph... (This may take a moment)")
    model = genai.GenerativeModel(model_name=MODEL_NAME)
    request = [PROMPT] + gemini_files
    
    try:
        response = model.generate_content(request, request_options={'timeout': 600})
        json_str = response.text.strip().replace("```json", "").replace("```", "")
        graph_data = json.loads(json_str)
        
        with open(OUTPUT_FILE, "w") as f:
            json.dump(graph_data, f, indent=4)
            
        print(f"\n✨ Success! Knowledge graph saved to '{OUTPUT_FILE}'")
        print(f"   Nodes found: {len(graph_data.get('nodes', []))}")
        print(f"   Edges found: {len(graph_data.get('edges', []))}")

    except Exception as e:
        print(f"\n❌ An error occurred during processing.")
        print(f"   Error details: {e}")
        # In case of an error, print the raw response if it exists
        if 'response' in locals() and hasattr(response, 'text'):
            print(f"\n--- Raw Model Response ---\n{response.text}\n--------------------------")

if __name__ == "__main__":
    main()