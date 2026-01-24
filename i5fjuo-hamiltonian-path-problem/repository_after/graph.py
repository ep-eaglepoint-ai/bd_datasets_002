"""Graph data structure (Req 1): adjacency matrix + list, directed/undirected, weighted."""

from __future__ import annotations

from dataclasses import dataclass, field


class GraphValidationError(Exception):
    """Raised for invalid vertex references or non-positive edge weights."""

    pass


@dataclass
class Graph:
    """
    Graph with O(1) edge lookup (adjacency matrix) and efficient neighbor
    traversal (adjacency list). Supports directed/undirected, weighted edges.
    """

    n: int  # number of vertices 0..n-1
    directed: bool
    _matrix: list[list[float]] = field(default_factory=list)  # weight or 0 = no edge
    _adj: list[list[tuple[int, float]]] = field(default_factory=list)  # (neighbor, weight)

    def __post_init__(self) -> None:
        if self.n < 1:
            raise GraphValidationError("Graph must have at least 1 vertex")
        self._matrix = [[0.0] * self.n for _ in range(self.n)]
        self._adj = [[] for _ in range(self.n)]

    def add_edge(self, u: int, v: int, weight: float = 1.0, directed: bool | None = None) -> None:
        """Add edge u -> v with optional weight. Use directed=... to override graph default."""
        self._validate_vertex(u)
        self._validate_vertex(v)
        if weight <= 0:
            raise GraphValidationError(f"Edge weight must be positive, got {weight}")
        d = self.directed if directed is None else directed
        self._matrix[u][v] = weight
        self._adj[u].append((v, weight))
        if not d and u != v:
            self._matrix[v][u] = weight
            self._adj[v].append((u, weight))

    def _validate_vertex(self, v: int) -> None:
        if not (0 <= v < self.n):
            raise GraphValidationError(f"Invalid vertex {v}; valid range [0, {self.n - 1}]")

    def has_edge(self, u: int, v: int) -> bool:
        """O(1) edge existence check."""
        return 0 <= u < self.n and 0 <= v < self.n and self._matrix[u][v] > 0

    def edge_weight(self, u: int, v: int) -> float:
        """Return weight of u->v or 0 if no edge."""
        if not (0 <= u < self.n and 0 <= v < self.n):
            raise GraphValidationError(f"Invalid vertex in edge ({u}, {v})")
        return self._matrix[u][v]

    def neighbors(self, v: int) -> list[tuple[int, float]]:
        """Efficient neighbor traversal. Returns list of (neighbor, weight)."""
        self._validate_vertex(v)
        return list(self._adj[v])

    def vertices(self) -> list[int]:
        return list(range(self.n))
