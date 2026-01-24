from dataclasses import dataclass

@dataclass
class Node:
    id: str
    label: str
    description: str = ""

@dataclass
class Edge:
    source: str
    target: str
    relationship: str
