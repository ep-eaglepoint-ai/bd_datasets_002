"""Hamiltonian path/cycle solver: backtracking + degree pruning, Warnsdorff (Req 2–5)."""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from .graph import Graph


# Result types (Req 7)


@dataclass
class HamiltonianPathResult:
    """Result of a path-finding operation. Never null; use success + message."""

    success: bool
    path: list[int] = field(default_factory=list)
    cost: float = 0.0
    time_ms: float = 0.0
    message: str = ""

    def __bool__(self) -> bool:
        return self.success


@dataclass
class AllPathsResult:
    success: bool
    paths: list[list[int]] = field(default_factory=list)
    time_ms: float = 0.0
    message: str = ""


@dataclass
class MinCostResult:
    success: bool
    path: list[int] = field(default_factory=list)
    cost: float = 0.0
    time_ms: float = 0.0
    message: str = ""


def _path_cost(g: Graph, path: list[int]) -> float:
    """Sum edge weights along path. No graph copies; O(V)."""
    total = 0.0
    for i in range(len(path) - 1):
        total += g.edge_weight(path[i], path[i + 1])
    return total


def _degree_to_unvisited(g: Graph, u: int, unvisited: set[int]) -> int:
    """Count neighbors of u that are in unvisited."""
    return sum(1 for v, _ in g.neighbors(u) if v in unvisited)


def _has_zero_connections_to_unvisited(g: Graph, unvisited: set[int], final_ok: int | None) -> bool:
    """Degree-based pruning: any unvisited (except final) with 0 connections to unvisited?"""
    for u in unvisited:
        if u == final_ok:
            continue
        if _degree_to_unvisited(g, u, unvisited) == 0:
            return True
    return False


def _warnsdorff_order(g: Graph, v: int, unvisited: set[int]) -> list[int]:
    """Order neighbors by increasing degree (to unvisited). Fewer connections first."""
    cand = [(w, _degree_to_unvisited(g, w, unvisited)) for w, _ in g.neighbors(v) if w in unvisited]
    cand.sort(key=lambda x: x[1])
    return [w for w, _ in cand]


def _backtrack_one(
    g: Graph,
    path: list[int],
    unvisited: set[int],
    start: int | None,
    find_all: bool,
    best_cost: list[float],
    best_path: list[list[int]],
    all_paths: list[list[int]] | None,
    is_cycle: bool,
) -> None:
    """
    Backtracking core. Uses degree pruning, connectivity (implied), Warnsdorff ordering.
    """
    n = g.n
    current = path[-1]

    if len(path) == n:
        if is_cycle:
            if not g.has_edge(current, path[0]):
                return
            c = _path_cost(g, path) + g.edge_weight(current, path[0])
        else:
            c = _path_cost(g, path)
        if find_all and all_paths is not None:
            all_paths.append(path[:])
        else:
            if c < best_cost[0]:
                best_cost[0] = c
                best_path[0] = path[:]
        return

    unvisited.discard(current)
    rem = n - len(path)
    final_ok = None
    if rem == 1:
        final_ok = next(iter(unvisited))

    if not g.directed and _has_zero_connections_to_unvisited(g, unvisited, final_ok):
        unvisited.add(current)
        return

    ordered = _warnsdorff_order(g, current, unvisited)
    for w in ordered:
        path.append(w)
        _backtrack_one(g, path, unvisited, start, find_all, best_cost, best_path, all_paths, is_cycle)
        path.pop()

    unvisited.add(current)


def _find_one_path(g: Graph, start: int | None, is_cycle: bool) -> HamiltonianPathResult:
    """Find a single Hamiltonian path (or cycle). Reports timing."""
    t0 = time.perf_counter()
    n = g.n
    if n == 1:
        elapsed = (time.perf_counter() - t0) * 1000.0
        return HamiltonianPathResult(success=True, path=[0], cost=0.0, time_ms=elapsed)

    inf = float("inf")
    best_cost = [inf]
    best_path: list[list[int]] = [[]]
    starts: list[int] = [start] if start is not None else list(range(n))

    for s in starts:
        path = [s]
        unvisited = set(range(n)) - {s}
        _backtrack_one(g, path, unvisited, start, False, best_cost, best_path, None, is_cycle)
        if best_path[0]:
            break

    elapsed = (time.perf_counter() - t0) * 1000.0
    if not best_path[0]:
        return HamiltonianPathResult(
            success=False,
            time_ms=elapsed,
            message="No Hamiltonian path exists.",
        )
    cost = _path_cost(g, best_path[0])
    if is_cycle:
        cost += g.edge_weight(best_path[0][-1], best_path[0][0])
    return HamiltonianPathResult(
        success=True,
        path=best_path[0],
        cost=cost,
        time_ms=elapsed,
    )


def find_hamiltonian_path(g: Graph, start: int | None = None) -> HamiltonianPathResult:
    """Find a Hamiltonian path. start=None: try all; start=k: only paths from k."""
    return _find_one_path(g, start, is_cycle=False)


def find_hamiltonian_cycle(g: Graph, start: int | None = None) -> HamiltonianPathResult:
    """Find a Hamiltonian cycle (path + edge back to start)."""
    return _find_one_path(g, start, is_cycle=True)


def find_all_hamiltonian_paths(g: Graph) -> AllPathsResult:
    """Enumerate all Hamiltonian paths; duplicate-free. Timing reported."""
    t0 = time.perf_counter()
    n = g.n
    all_paths: list[list[int]] = []
    if n == 1:
        all_paths = [[0]]
    else:
        inf = float("inf")
        best_cost = [inf]
        best_path: list[list[int]] = [[]]
        for s in range(n):
            path = [s]
            unvisited = set(range(n)) - {s}
            _backtrack_one(g, path, unvisited, None, True, best_cost, best_path, all_paths, False)
    elapsed = (time.perf_counter() - t0) * 1000.0
    return AllPathsResult(success=True, paths=all_paths, time_ms=elapsed)


def find_min_cost_hamiltonian_path(g: Graph, start: int | None = None) -> MinCostResult:
    """Minimum total cost Hamiltonian path. Cost = sum of edge weights."""
    t0 = time.perf_counter()
    n = g.n
    if n == 1:
        elapsed = (time.perf_counter() - t0) * 1000.0
        return MinCostResult(success=True, path=[0], cost=0.0, time_ms=elapsed)

    inf = float("inf")
    best_cost = [inf]
    best_path: list[list[int]] = [[]]
    starts = [start] if start is not None else list(range(n))

    for s in starts:
        path = [s]
        unvisited = set(range(n)) - {s}
        _backtrack_one(g, path, unvisited, start, False, best_cost, best_path, None, False)

    elapsed = (time.perf_counter() - t0) * 1000.0
    if not best_path[0]:
        return MinCostResult(
            success=False,
            time_ms=elapsed,
            message="No Hamiltonian path exists.",
        )
    cost = _path_cost(g, best_path[0])
    return MinCostResult(success=True, path=best_path[0], cost=cost, time_ms=elapsed)


def verify_path(g: Graph, path: list[int], require_cycle: bool = False) -> tuple[bool, str]:
    """Verify path: correct length, all vertices once, consecutive edges exist."""
    n = g.n
    if len(path) != n:
        return False, f"Path length {len(path)} != vertex count {n}"
    seen = set(path)
    if len(seen) != n or any(not (0 <= v < n) for v in path):
        return False, "Path must contain each vertex exactly once (valid indices)"
    for i in range(len(path) - 1):
        if not g.has_edge(path[i], path[i + 1]):
            return False, f"Missing edge ({path[i]}, {path[i + 1]})"
    if require_cycle and not g.has_edge(path[-1], path[0]):
        return False, f"Missing cycle edge ({path[-1]}, {path[0]})"
    return True, "Path is valid"
