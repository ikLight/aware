# test_json.py
import json
from pathlib import Path

def read_graph_file(file_path: str):
    """Test function to read and validate graph JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            print("Raw content:", content[:100] + "...")  # Print first 100 chars
            
            # Try to parse as is
            try:
                data = json.loads(content)
                print("Successfully parsed JSON")
                return data
            except json.JSONDecodeError as e:
                print(f"Initial parse failed: {e}")
                
                # Remove markdown formatting if present
                content = content.replace("```json", "").replace("```", "").strip()
                
                # Fix unquoted property names
                import re
                content = re.sub(r'(?<!["\\])(\b\w+\b)(?=\s*:)', r'"\1"', content)
                
                print("Cleaned content:", content[:100] + "...")
                
                # Try parsing again
                data = json.loads(content)
                print("Successfully parsed JSON after cleanup")
                return data
                
    except Exception as e:
        print(f"Error reading file: {e}")
        raise

if __name__ == "__main__":
    # Get the username from command line or use default
    import sys
    username = sys.argv[1] if len(sys.argv) > 1 else "test1"
    
    # Try to read the graph file
    file_path = Path("uploads") / f"{username}_knowledge_graph.json"
    if not file_path.exists():
        print(f"File not found: {file_path}")
        sys.exit(1)
        
    data = read_graph_file(str(file_path))
    print("\nGraph data structure:")
    print("Nodes:", len(data.get('nodes', [])))
    print("Edges:", len(data.get('edges', [])))
    print("\nSample node:", next(iter(data.get('nodes', [])), None))
    print("Sample edge:", next(iter(data.get('edges', [])), None))