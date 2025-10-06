import json
import networkx as nx
from pyvis.network import Network

# --- Configuration ---
INPUT_JSON_FILE = "parse_course/knowledge_graph.json"
OUTPUT_HTML_FILE = "parse_course/graph_visualization.html"

def main():
    """
    Loads a knowledge graph from a JSON file and creates an
    interactive HTML visualization.
    """
    print(f"🚀 Reading data from '{INPUT_JSON_FILE}'...")
    try:
        with open(INPUT_JSON_FILE, 'r') as f:
            graph_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: The file '{INPUT_JSON_FILE}' was not found.")
        return
    except json.JSONDecodeError:
        print(f"Error: The file '{INPUT_JSON_FILE}' is not a valid JSON file.")
        return

    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])

    if not nodes:
        print("No nodes found in the JSON file. Cannot create a graph.")
        return

    # --- Create the graph using NetworkX ---
    G = nx.Graph()

    # Add nodes to the graph
    for node in nodes:
        G.add_node(node, label=node, title=node)

    # Add edges to the graph
    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        relationship = edge.get("relationship", "")
        
        # Ensure both source and target nodes exist before adding an edge
        if source in G and target in G:
            G.add_edge(source, target, title=relationship, label=relationship)

    # --- Create the interactive visualization using Pyvis ---
    print("🧠 Building interactive visualization...")
    net = Network(height="800px", width="100%", bgcolor="#222222", font_color="white", notebook=True, cdn_resources='in_line')

    # Load the NetworkX graph into Pyvis
    net.from_nx(G)

    # Add physics layout options for better visualization
    net.force_atlas_2based(gravity=-400, central_gravity=0.005, spring_length=100, spring_strength=0.08, damping=0.9, overlap=0)
    
    # Add UI controls to the graph
    net.show_buttons(filter_=['physics'])

    # --- Generate the HTML file ---
    try:
        net.save_graph(OUTPUT_HTML_FILE)
        print(f"\n✨ Success! Interactive graph saved to '{OUTPUT_HTML_FILE}'")
        print("   Open this file in your web browser to explore the graph.")
    except Exception as e:
        print(f"\n❌ An error occurred while saving the HTML file: {e}")

if __name__ == "__main__":
    main()