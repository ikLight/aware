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

    # Add nodes to the graph with enhanced styling
    for node in nodes:
        G.add_node(
            node, 
            label=node, 
            title=node,
            color="#1d4ed8",  # Blue color for nodes
            size=25,  # Slightly larger nodes
            font={"size": 14, "color": "#1f2937"},  # Readable font
            borderWidth=2,
            borderWidthSelected=3,
        )

    # Add edges to the graph with enhanced styling
    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        relationship = edge.get("relationship", "")
        
        if source in G and target in G:
            G.add_edge(
                source, 
                target, 
                title=relationship, 
                label=relationship,
                color={"color": "#94a3b8", "highlight": "#60a5fa"},  # Slate color for edges
                width=2,
                font={"size": 12, "color": "#4b5563"},  # Smaller font for relationships
                smooth={"type": "continuous"},  # Smoother edge curves
            )

    # Create the interactive visualization using Pyvis
    net = Network(
        height="100%",
        width="100%", 
        bgcolor="transparent",  # Use transparent background
        font_color="#1f2937",
        directed=True,  # Show edge direction
        select_menu=True,  # Enable node/edge selection menu
        filter_menu=True,  # Enable filtering menu
        notebook=True,
        cdn_resources='in_line'
    )
    
    # Configure network options
    net.set_options("""
    const options = {
        nodes: {
            shape: 'dot',
            size: 30,
            font: {
                size: 14,
                face: 'Inter'
            },
            borderWidth: 2,
            shadow: true
        },
        edges: {
            width: 2,
            color: {
                color: '#94a3b8',
                highlight: '#60a5fa'
            },
            font: {
                size: 12,
                face: 'Inter'
            },
            shadow: true,
            smooth: {
                type: 'continuous'
            }
        },
        physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
                gravitationalConstant: -500,
                centralGravity: 0.01,
                springLength: 200,
                springConstant: 0.08,
                damping: 0.4,
                avoidOverlap: 1
            },
            maxVelocity: 50,
            minVelocity: 0.1,
            stabilization: {
                enabled: true,
                iterations: 1000,
                updateInterval: 25
            }
        },
        interaction: {
            hover: true,
            navigationButtons: true,
            keyboard: true,
            tooltipDelay: 100,
            zoomView: true,
            dragView: true
        }
    }
    """)

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