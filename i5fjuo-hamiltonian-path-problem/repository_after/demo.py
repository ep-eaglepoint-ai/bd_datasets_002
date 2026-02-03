"""Runnable demonstration (Req 8)."""

from .delivery import Location, plan_delivery
from .graph import Graph
from .solver import (
    find_all_hamiltonian_paths,
    find_hamiltonian_cycle,
    find_hamiltonian_path,
    find_min_cost_hamiltonian_path,
    verify_path,
)


def run_demo() -> None:
    """Demonstrate: basic path finding, delivery optimization, min-cost, disconnected."""
    print("=" * 60)
    print("Hamiltonian Path/Cycle — Delivery Route Optimization Demo")
    print("=" * 60)

    print("\n--- 1. Basic path finding (simple undirected graph) ---")
    g1 = Graph(n=4, directed=False)
    g1.add_edge(0, 1, 1.0)
    g1.add_edge(1, 2, 1.0)
    g1.add_edge(2, 3, 1.0)
    g1.add_edge(0, 2, 1.0)
    print("Graph: 4 vertices, edges 0-1, 1-2, 2-3, 0-2")
    r1 = find_hamiltonian_path(g1)
    print(f"Result: success={r1.success}, path={r1.path}, cost={r1.cost:.2f}, time={r1.time_ms:.2f} ms")
    ok, msg = verify_path(g1, r1.path)
    print(f"Verification: {msg}")

    print("\n--- 2. Delivery optimization (named locations, travel times) ---")
    locs = [
        Location("A", "Warehouse", "123 Depot St"),
        Location("B", "Shop North", "456 North Ave"),
        Location("C", "Shop South", "789 South Blvd"),
    ]
    costs = {
        ("A", "B"): 10.0,
        ("A", "C"): 15.0,
        ("B", "A"): 10.0,
        ("B", "C"): 8.0,
        ("C", "A"): 15.0,
        ("C", "B"): 8.0,
    }
    d = plan_delivery(locs, costs, start_id="A")
    print(f"Locations: {[loc.name for loc in locs]}, start=A")
    print(f"Delivery result: success={d.success}, total_cost={d.total_cost:.2f}, time={d.time_ms:.2f} ms")
    for s in d.itinerary:
        print(f"  Stop {s.stop_number}: {s.name} ({s.address}) — cost from previous: {s.cost_from_previous:.2f}")

    print("\n--- 3. Minimum-cost Hamiltonian path (weighted) ---")
    g3 = Graph(n=4, directed=False)
    g3.add_edge(0, 1, 2.0)
    g3.add_edge(1, 2, 1.0)
    g3.add_edge(2, 3, 3.0)
    g3.add_edge(0, 2, 4.0)
    g3.add_edge(0, 3, 5.0)
    g3.add_edge(1, 3, 2.0)
    m = find_min_cost_hamiltonian_path(g3)
    print(f"Result: success={m.success}, path={m.path}, cost={m.cost:.2f}, time={m.time_ms:.2f} ms")
    ok3, _ = verify_path(g3, m.path)
    print(f"Verification: valid={ok3}")

    print("\n--- 4. Disconnected graph (no Hamiltonian path) ---")
    g4 = Graph(n=4, directed=False)
    g4.add_edge(0, 1, 1.0)
    g4.add_edge(2, 3, 1.0)
    print("Graph: two components {0,1} and {2,3}")
    r4 = find_hamiltonian_path(g4)
    print(f"Result: success={r4.success}, message={r4.message!r}, time={r4.time_ms:.2f} ms")

    print("\n--- 5. Enumerate all Hamiltonian paths ---")
    g5 = Graph(n=3, directed=False)
    g5.add_edge(0, 1, 1.0)
    g5.add_edge(1, 2, 1.0)
    g5.add_edge(0, 2, 1.0)
    a = find_all_hamiltonian_paths(g5)
    print(f"Complete graph K3: {len(a.paths)} paths, time={a.time_ms:.2f} ms")
    for p in a.paths:
        print(f"  {p}")

    print("\n--- 6. Hamiltonian cycle ---")
    rc = find_hamiltonian_cycle(g5)
    print(f"Result: success={rc.success}, path={rc.path}, cost={rc.cost:.2f}, time={rc.time_ms:.2f} ms")
    okc, msgc = verify_path(g5, rc.path, require_cycle=True)
    print(f"Verification (cycle): {msgc}")

    print("\n" + "=" * 60)
    print("Demo complete. All scenarios ran successfully.")
    print("=" * 60)


if __name__ == "__main__":
    run_demo()
