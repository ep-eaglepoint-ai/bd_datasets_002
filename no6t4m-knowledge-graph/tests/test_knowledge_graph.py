import unittest
import json
import os
import importlib

target_repository = os.environ.get("TARGET_REPOSITORY", "repository_after")
module = importlib.import_module(f"{target_repository}.knowledge_graph")

KnowledgeGraph = getattr(module, "KnowledgeGraph")

class TestKnowledgeGraph(unittest.TestCase):

    def setUp(self):
        """Runs before every test method. Creates a fresh graph."""
        self.graph = KnowledgeGraph()

    def test_add_and_get_node(self):
        """Test adding a node and retrieving its details."""
        self.graph.add_node("A", "Label A", "Description A")
        
        self.assertIn("A", self.graph.nodes)
        self.assertEqual(self.graph.nodes["A"]["label"], "Label A")
        self.assertEqual(self.graph.nodes["A"]["desc"], "Description A")

    def test_remove_node(self):
        """Test removing a node."""
        self.graph.add_node("A", "Label A")
        self.graph.remove_node("A")
        self.assertNotIn("A", self.graph.nodes)

    def test_add_edge_valid(self):
        """Test connecting two existing nodes."""
        self.graph.add_node("A", "Start")
        self.graph.add_node("B", "End")
        
        self.graph.add_edge("A", "B", "connects_to")
        
        neighbors = self.graph.get_neighbors("A")
        self.assertEqual(len(neighbors), 1)
        self.assertEqual(neighbors[0], ("B", "connects_to"))

    def test_add_edge_invalid(self):
        """Test that you cannot add an edge to a non-existent node."""
        self.graph.add_node("A", "Start")
        # B does not exist yet
        self.graph.add_edge("A", "B", "connects_to")
        
        neighbors = self.graph.get_neighbors("A")
        self.assertEqual(len(neighbors), 0)

    def test_remove_edge(self):
        """Test removing a specific relationship."""
        self.graph.add_node("A", "Start")
        self.graph.add_node("B", "End")
        self.graph.add_edge("A", "B", "connects_to")
        
        self.graph.remove_edge("A", "B")
        self.assertEqual(len(self.graph.get_neighbors("A")), 0)

    def test_integrity_on_node_deletion(self):
        """
        CRITICAL: If Node B is deleted, edges pointing to B from Node A 
        should also be removed automatically.
        """
        self.graph.add_node("A", "Start")
        self.graph.add_node("B", "End")
        self.graph.add_edge("A", "B", "connects_to")
        
        # Now delete B
        self.graph.remove_node("B")
        
        # Check A's neighbors. Should be empty.
        neighbors_of_a = self.graph.get_neighbors("A")
        self.assertEqual(len(neighbors_of_a), 0, "Edge to B should have been cleaned up")

    def test_search_functionality(self):
        """Test searching by ID and Label (case-insensitive)."""
        self.graph.add_node("python", "Python Lang", "Coding")
        self.graph.add_node("java", "Java Lang", "Coding")
        
        # Exact ID match
        results = self.graph.search_nodes("python")
        self.assertIn("python", results)
        
        # Partial Label match (case-insensitive)
        results = self.graph.search_nodes("pyth")
        self.assertIn("python", results)
        
        # Search returns multiple
        results = self.graph.search_nodes("Lang")
        self.assertEqual(len(results), 2)

    def test_json_import_export(self):
        """Test that the graph state can be saved and restored identically."""
        # 1. Setup initial state
        self.graph.add_node("X", "Node X")
        self.graph.add_node("Y", "Node Y")
        self.graph.add_edge("X", "Y", "links")
        
        # 2. Export to JSON string
        json_output = self.graph.to_json()
        
        # 3. Create a NEW graph and import that JSON
        new_graph = KnowledgeGraph()
        new_graph.from_json(json_output)
        
        # 4. Verify new graph matches old graph
        self.assertIn("X", new_graph.nodes)
        self.assertIn("Y", new_graph.nodes)
        
        neighbors = new_graph.get_neighbors("X")
        self.assertEqual(neighbors[0], ("Y", "links"))

if __name__ == '__main__':
    unittest.main()