import os
import json
import pathlib
import google.generativeai as genai

# --- Configuration ---
# Set up your API key via the GOOGLE_API_KEY environment variable.
try:
    genai.configure(api_key="AIzaSyBWl60BJK0n3EbOPCJQB4gvYL95cEkfaeU")#os.environ["GOOGLE_API_KEY"])
except KeyError:
    print("Error: GOOGLE_API_KEY environment variable not set.")
    exit()

# Define the input folder and output file.
INPUT_DIR = "parse_course/course_materials"
OUTPUT_FILE = "parse_course/knowledge_graph.json"
OUTLINE_OUTPUT_JSON = "parse_course/course_outline.json"
OUTLINE_OUTPUT_HTML = "parse_course/outline.html"
GENERATE_GRAPH = False

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

OUTLINE_PROMPT = """
You are an expert instructional designer extracting the EXACT course outline from the attached course materials.

Selection policy for the canonical outline source:
1) Prefer a single file if its name contains any of: syllabus, course outline, table of contents, overview, course description (case-insensitive).
2) If none found, derive the outline from lecture notes (filenames or headings containing lecture, week, module), preserving their order and nesting strictly as written.

STRICT requirements:
- Copy headings/titles exactly as written: same wording, casing, numbering (e.g., "1.", "Week 2:").
- Do NOT paraphrase, summarize, or invent topics. Only include items present in the materials.
- Preserve the hierarchy: topics → subtopics → sub-subtopics, as indicated by numbering, indentation, heading levels, or document structure.
- If combining from lecture notes, treat each lecture/module/week as a top-level item and nest subheadings beneath it, preserving exact text.

Return ONLY a JSON object with this schema:
{
  "course_title": string or empty if unknown,
  "source_file": the chosen filename used for the outline, or a brief note like "derived from lecture notes",
  "outline": [
    { "label": exact heading text, "children": [ ... recursively same shape ... ] }
  ]
}
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

    # Create model once (used for outline; graph generation currently disabled by default)
    model = genai.GenerativeModel(model_name=MODEL_NAME)

    if GENERATE_GRAPH:
        print("\n🧠 Generating knowledge graph... (This may take a moment)")
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
            if 'response' in locals() and hasattr(response, 'text'):
                print(f"\n--- Raw Model Response ---\n{response.text}\n--------------------------")
    else:
        print("\n🧠 Skipping knowledge graph generation (disabled for now).")

    # --- Generate exact course outline ---
    print("\n🧩 Generating exact course outline... (This may take a moment)")
    outline_request = [OUTLINE_PROMPT] + gemini_files
    try:
        outline_response = model.generate_content(outline_request, request_options={'timeout': 600})
        outline_json_str = outline_response.text.strip().replace("```json", "").replace("```", "")
        outline_data = json.loads(outline_json_str)

        with open(OUTLINE_OUTPUT_JSON, "w") as f:
            json.dump(outline_data, f, indent=4)

        embedded_json = json.dumps(outline_data, ensure_ascii=False)
        outline_html = """<!doctype html>
<meta charset=\"utf-8\" />
<title>Course Outline</title>
<style>
  body{font:14px/1.5 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, \"Apple Color Emoji\", \"Segoe UI Emoji\";margin:24px;max-width:900px}
  details{margin:4px 0}
  summary{cursor:pointer}
  #meta{color:#555;margin-bottom:12px}
  .count{color:#777;font-size:12px;margin-left:8px}
</style>
<h1 id=\"title\">Course Outline</h1>
<div id=\"meta\"></div>
<div id=\"tree\"></div>
<script id=\"data\" type=\"application/json\">__DATA__</script>
<script>
const data = JSON.parse(document.getElementById('data').textContent);
const titleEl = document.getElementById('title');
if (data.course_title) titleEl.textContent = data.course_title;
const metaEl = document.getElementById('meta');
const topCount = (data.outline || []).length;
const src = data.source_file ? `Source: ${data.source_file}` : '';
metaEl.textContent = [src, `Top-level items: ${topCount}`].filter(Boolean).join(' \u2022 ');

function make(node) {
  const d = document.createElement('details');
  const s = document.createElement('summary');
  s.textContent = node.label || '';
  d.appendChild(s);
  (node.children || []).forEach(ch => d.appendChild(make(ch)));
  return d;
}

const treeEl = document.getElementById('tree');
(data.outline || []).forEach(n => treeEl.appendChild(make(n)));
</script>
"""
        outline_html = outline_html.replace("__DATA__", embedded_json)

        with open(OUTLINE_OUTPUT_HTML, "w") as f:
            f.write(outline_html)

        print(f"\n✨ Success! Outline saved to '{OUTLINE_OUTPUT_JSON}' and viewer to '{OUTLINE_OUTPUT_HTML}'")
        print(f"   Top-level items: {len(outline_data.get('outline', []))}")

    except Exception as e:
        print(f"\n❌ An error occurred during outline generation.")
        print(f"   Error details: {e}")
        if 'outline_response' in locals() and hasattr(outline_response, 'text'):
            print(f"\n--- Raw Outline Response ---\n{outline_response.text}\n----------------------------")

if __name__ == "__main__":
    main()