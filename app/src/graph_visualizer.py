import json
import networkx as nx
from pyvis.network import Network

def generate_graph_visualization(graph_data: dict) -> str:
    """
    Generates an HTML visualization from knowledge graph data.
    
    Args:
        graph_data: Dictionary containing 'nodes' and 'edges'
        
    Returns:
        HTML string containing the interactive visualization
    """
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])

    if not nodes:
        raise ValueError("No nodes found in the graph data")

    # Create the graph using NetworkX
    G = nx.Graph()

    # Add nodes to the graph
    for node in nodes:
        G.add_node(node, label=node, title=node)

    # Add edges to the graph
    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        relationship = edge.get("relationship", "")
        
        if source in G and target in G:
            G.add_edge(source, target, title=relationship, label=relationship)

    # Create the interactive visualization using Pyvis
    net = Network(
        height="600px",
        width="100%", 
        bgcolor="#ffffff",
        font_color="#000000",
        notebook=True,
        cdn_resources='in_line'
    )

    # Load the NetworkX graph into Pyvis
    net.from_nx(G)

    # Add physics layout options
    net.force_atlas_2based(
        gravity=-400,
        central_gravity=0.005,
        spring_length=100,
        spring_strength=0.08,
        damping=0.9,
        overlap=0
    )
    
    # Add UI controls
    net.show_buttons(filter_=['physics'])

    # Get the HTML content
    html_content = net.generate_html()
    return html_content