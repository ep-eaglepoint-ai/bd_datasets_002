from typing import List, Dict, Any, Optional
# typing: Provides runtime support for type hints.
# No side effects; used for static analysis and documentation.

class Node:
    """
    Data structure representing an organizational unit.
    'id': Unique string identifier.
    'value': Integer weight of the current node.
    'children': List of node IDs representing direct reports or sub-units.
    """
    def __init__(self, node_id: str, value: int, children: List[str]):
        self.node_id = node_id
        self.value = value
        self.children = children

class LegacyHierarchyService:
    """
    Current failing implementation. 
    Relies on a flat registry (datastore) to resolve child IDs to Node objects.
    """
    def __init__(self, datastore: Dict[str, Node]):
        self.datastore = datastore

    def calculate_total_weight(self, node_id: str) -> int:
        # WARNING: This implementation is hitting recursion limits
        # and lacks protection against cycles or redundant DAG nodes.
        node = self.datastore.get(node_id)
        if not node:
            return 0
        
        total = node.value
        for child_id in node.children:
            total += self.calculate_total_weight(child_id)
        return total