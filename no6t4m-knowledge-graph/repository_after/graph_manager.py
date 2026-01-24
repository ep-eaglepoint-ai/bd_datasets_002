import json
from collections import defaultdict
from typing import List, Dict, Tuple
from graph_entities import Node, Edge

class KnowledgeGraph:
    """
    Manages the graph data structure, relationships, and persistence.
    Uses an Adjacency List approach for performance O(1).
    """
    def __init__(self):
        # Format: {node_id: Node}
        self.nodes: Dict[str, Node] = {}
        # Format: {node_id: [Edge]}
        self.edges: Dict[str, List[Edge]] = defaultdict(list)

    def add_node(self, node_id: str, label: str, description: str = ""):
        self.nodes[node_id] = Node(id=node_id, label=label, description=description)
        if node_id not in self.edges:
            self.edges[node_id] = []

    def remove_node(self, node_id: str):
        if node_id in self.nodes:
            del self.nodes[node_id]
        if node_id in self.edges:
            del self.edges[node_id]
        # Remove incoming edges from other nodes
        for nid in self.edges:
            self.edges[nid] = [e for e in self.edges[nid] if e.target != node_id]

    def add_edge(self, source: str, target: str, relationship: str):
        if source in self.nodes and target in self.nodes:
            # Avoid duplicates
            for edge in self.edges[source]:
                if edge.target == target and edge.relationship == relationship:
                    return
            self.edges[source].append(Edge(source=source, target=target, relationship=relationship))

    def remove_edge(self, source: str, target: str):
        if source in self.edges:
            self.edges[source] = [e for e in self.edges[source] if e.target != target]

    def get_neighbors(self, node_id: str) -> List[Edge]:
        """Returns list of Edge objects"""
        return self.edges.get(node_id, [])

    def search_nodes(self, query: str) -> List[str]:
        """Returns node_ids matching the query (case-insensitive)"""
        query = query.lower()
        results = []
        for nid, node in self.nodes.items():
            if query in nid.lower() or query in node.label.lower():
                results.append(nid)
        return results

    def to_json(self) -> str:
        data = {
            "nodes": {nid: {"label": n.label, "desc": n.description} for nid, n in self.nodes.items()},
            "edges": {k: [[e.target, e.relationship] for e in v] for k, v in self.edges.items() if v}
        }
        return json.dumps(data, indent=2)

    def from_json(self, json_str: str):
        try:
            data = json.loads(json_str)
            raw_nodes = data.get("nodes", {})
            self.nodes = {}
            for nid, attrs in raw_nodes.items():
                self.nodes[nid] = Node(id=nid, label=attrs.get("label", ""), description=attrs.get("desc", ""))
            
            raw_edges = data.get("edges", {})
            self.edges = defaultdict(list)
            
            # Ensure every node has an entry in edges
            for nid in self.nodes:
                self.edges[nid] = []

            for k, v in raw_edges.items():
                # raw_edges format is {source: [[target, rel], ...]}
                for item in v:
                    if len(item) >= 2:
                        target, rel = item[0], item[1]
                        self.edges[k].append(Edge(source=k, target=target, relationship=rel))
        except json.JSONDecodeError:
            pass # Handle gracefully in UI

    def populate_demo_data(self):
        """Creates a sample graph for testing"""
        self.add_node("AI", "Artificial Intelligence", "Simulation of human intelligence.")
        self.add_node("ML", "Machine Learning", "Subset of AI focused on data.")
        self.add_node("DL", "Deep Learning", "Neural networks with many layers.")
        self.add_node("NN", "Neural Network", "Computing system inspired by biological brains.")
        self.add_node("PY", "Python", "A popular programming language.")
        
        self.add_edge("AI", "ML", "includes")
        self.add_edge("ML", "DL", "includes")
        self.add_edge("DL", "NN", "relies_on")
        self.add_edge("ML", "PY", "uses")
        self.add_edge("PY", "AI", "implements")
