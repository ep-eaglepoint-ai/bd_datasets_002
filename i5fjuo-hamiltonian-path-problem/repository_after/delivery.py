"""Location model and delivery itinerary (Req 6)."""

from __future__ import annotations

from dataclasses import dataclass, field

from .graph import Graph
from .solver import find_min_cost_hamiltonian_path


@dataclass
class Location:
    """Business domain: delivery stop. id, name, address."""

    id: str
    name: str
    address: str


@dataclass
class StopInfo:
    """Per-stop itinerary entry."""

    stop_number: int
    location_id: str
    name: str
    address: str
    cost_from_previous: float


@dataclass
class DeliveryResult:
    """Structured delivery itinerary. Success or failure with message."""

    success: bool
    total_cost: float = 0.0
    stop_count: int = 0
    location_ids: list[str] = field(default_factory=list)
    itinerary: list[StopInfo] = field(default_factory=list)
    time_ms: float = 0.0
    message: str = ""


def plan_delivery(
    locations: list[Location],
    cost_matrix: dict[tuple[str, str], float],
    start_id: str | None = None,
) -> DeliveryResult:
    """
    Build graph from locations and cost_matrix. Missing (i,j) = no direct route.
    Asymmetric costs supported. Returns DeliveryResult with itinerary or failure.
    """
    if not locations:
        return DeliveryResult(success=False, message="No locations provided.")

    by_id = {loc.id: loc for loc in locations}
    ids = [loc.id for loc in locations]
    id2v = {lid: i for i, lid in enumerate(ids)}
    n = len(locations)

    g = Graph(n=n, directed=True)
    for (i, j), w in cost_matrix.items():
        if i not in id2v or j not in id2v:
            continue
        if w <= 0:
            return DeliveryResult(success=False, message=f"Non-positive cost for ({i}, {j}): {w}")
        u, v = id2v[i], id2v[j]
        if g.has_edge(u, v):
            continue
        g.add_edge(u, v, weight=w, directed=True)

    start_v = None
    if start_id is not None:
        if start_id not in id2v:
            return DeliveryResult(success=False, message=f"Unknown start location: {start_id}")
        start_v = id2v[start_id]

    res = find_min_cost_hamiltonian_path(g, start_v)
    if not res.success:
        return DeliveryResult(
            success=False,
            time_ms=res.time_ms,
            message=res.message or "No valid delivery route exists.",
        )

    itinerary: list[StopInfo] = []
    path = res.path
    total = 0.0
    for idx, v in enumerate(path):
        lid = ids[v]
        loc = by_id[lid]
        cost_prev = 0.0
        if idx > 0:
            cost_prev = g.edge_weight(path[idx - 1], v)
            total += cost_prev
        itinerary.append(
            StopInfo(
                stop_number=idx + 1,
                location_id=lid,
                name=loc.name,
                address=loc.address,
                cost_from_previous=cost_prev,
            )
        )

    return DeliveryResult(
        success=True,
        total_cost=total,
        stop_count=len(path),
        location_ids=[ids[v] for v in path],
        itinerary=itinerary,
        time_ms=res.time_ms,
    )
