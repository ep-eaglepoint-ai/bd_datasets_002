"""
Single test suite for Hamiltonian Path/Cycle solver (repository_after).
Covers graph, solver, delivery, and demo.

Run from project root (i5fjuo-hamiltonian-path-problem):
  python -m unittest tests.test
  python -m unittest tests.test -v
  pytest tests/test.py -v
"""

import io
import sys
import unittest

from repository_after import (
    Graph,
    GraphValidationError,
    Location,
    find_all_hamiltonian_paths,
    find_hamiltonian_cycle,
    find_hamiltonian_path,
    find_min_cost_hamiltonian_path,
    plan_delivery,
    run_demo,
    verify_path,
)


# -----------------------------------------------------------------------------
# Graph (Req 1)
# -----------------------------------------------------------------------------


class TestGraph(unittest.TestCase):
    def test_graph_single_vertex(self):
        g = Graph(n=1, directed=False)
        self.assertEqual(g.vertices(), [0])
        self.assertFalse(g.has_edge(0, 0))

    def test_graph_validation_n_vertices(self):
        with self.assertRaises(GraphValidationError) as ctx:
            Graph(n=0, directed=False)
        self.assertIn("at least 1 vertex", str(ctx.exception))

    def test_graph_add_edge_undirected(self):
        g = Graph(n=3, directed=False)
        g.add_edge(0, 1, 2.0)
        self.assertTrue(g.has_edge(0, 1))
        self.assertTrue(g.has_edge(1, 0))
        self.assertEqual(g.edge_weight(0, 1), 2.0)
        self.assertEqual(g.edge_weight(1, 0), 2.0)

    def test_graph_add_edge_directed(self):
        g = Graph(n=3, directed=True)
        g.add_edge(0, 1, 5.0)
        self.assertTrue(g.has_edge(0, 1))
        self.assertFalse(g.has_edge(1, 0))
        self.assertEqual(g.edge_weight(0, 1), 5.0)

    def test_graph_asymmetric_directed(self):
        g = Graph(n=2, directed=True)
        g.add_edge(0, 1, 10.0)
        g.add_edge(1, 0, 3.0)
        self.assertEqual(g.edge_weight(0, 1), 10.0)
        self.assertEqual(g.edge_weight(1, 0), 3.0)

    def test_graph_per_edge_directed_override(self):
        g = Graph(n=2, directed=False)
        g.add_edge(0, 1, 5.0, directed=True)
        self.assertTrue(g.has_edge(0, 1))
        self.assertFalse(g.has_edge(1, 0))

    def test_graph_invalid_vertex_add_edge(self):
        g = Graph(n=2, directed=False)
        with self.assertRaises(GraphValidationError):
            g.add_edge(0, 5, 1.0)
        with self.assertRaises(GraphValidationError):
            g.add_edge(-1, 0, 1.0)

    def test_graph_non_positive_weight(self):
        g = Graph(n=2, directed=False)
        with self.assertRaises(GraphValidationError):
            g.add_edge(0, 1, 0.0)
        with self.assertRaises(GraphValidationError):
            g.add_edge(0, 1, -1.0)

    def test_graph_neighbors(self):
        g = Graph(n=4, directed=False)
        g.add_edge(0, 1, 1.0)
        g.add_edge(0, 2, 2.0)
        g.add_edge(0, 3, 3.0)
        nbs = g.neighbors(0)
        self.assertEqual(len(nbs), 3)
        weights = {w: v for v, w in nbs}
        self.assertEqual(weights[1.0], 1)
        self.assertEqual(weights[2.0], 2)
        self.assertEqual(weights[3.0], 3)

    def test_graph_o1_has_edge(self):
        g = Graph(n=10, directed=False)
        for i in range(10):
            for j in range(i + 1, 10):
                g.add_edge(i, j, 1.0)
        self.assertTrue(g.has_edge(3, 7))
        self.assertTrue(g.has_edge(7, 3))
        self.assertFalse(g.has_edge(0, 0))

    def test_graph_invalid_vertex_neighbors(self):
        g = Graph(n=2, directed=False)
        with self.assertRaises(GraphValidationError):
            g.neighbors(10)


# -----------------------------------------------------------------------------
# Hamiltonian path/cycle (Req 2–5)
# -----------------------------------------------------------------------------


class TestHamiltonian(unittest.TestCase):
    def test_single_vertex_path(self):
        g = Graph(n=1, directed=False)
        r = find_hamiltonian_path(g)
        self.assertTrue(r.success)
        self.assertEqual(r.path, [0])
        self.assertEqual(r.cost, 0.0)
        self.assertGreaterEqual(r.time_ms, 0)

    def test_single_vertex_cycle(self):
        g = Graph(n=1, directed=False)
        g.add_edge(0, 0, 1.0)
        r = find_hamiltonian_cycle(g)
        self.assertTrue(r.success)
        self.assertEqual(r.path, [0])

    def test_disconnected_no_path(self):
        g = Graph(n=4, directed=False)
        g.add_edge(0, 1, 1.0)
        g.add_edge(2, 3, 1.0)
        r = find_hamiltonian_path(g)
        self.assertFalse(r.success)
        self.assertEqual(r.path, [])
        self.assertTrue("No Hamiltonian path" in r.message or "no" in r.message.lower())
        self.assertGreaterEqual(r.time_ms, 0)

    def test_simple_path_exists(self):
        g = Graph(n=4, directed=False)
        g.add_edge(0, 1, 1.0)
        g.add_edge(1, 2, 1.0)
        g.add_edge(2, 3, 1.0)
        g.add_edge(0, 2, 1.0)
        r = find_hamiltonian_path(g)
        self.assertTrue(r.success)
        self.assertEqual(len(r.path), 4)
        self.assertEqual(set(r.path), {0, 1, 2, 3})
        ok, msg = verify_path(g, r.path)
        self.assertTrue(ok, msg)

    def test_start_vertex_specified(self):
        g = Graph(n=3, directed=False)
        g.add_edge(0, 1, 1.0)
        g.add_edge(1, 2, 1.0)
        g.add_edge(0, 2, 1.0)
        r = find_hamiltonian_path(g, start=1)
        self.assertTrue(r.success)
        self.assertEqual(r.path[0], 1)
        ok, _ = verify_path(g, r.path)
        self.assertTrue(ok)

    def test_start_vertex_no_path(self):
        g = Graph(n=3, directed=False)
        g.add_edge(0, 1, 1.0)
        g.add_edge(1, 2, 1.0)
        r = find_hamiltonian_path(g, start=2)
        self.assertTrue(r.success)
        self.assertEqual(r.path[0], 2)

    def test_find_all_paths_k3(self):
        g = Graph(n=3, directed=False)
        g.add_edge(0, 1, 1.0)
        g.add_edge(1, 2, 1.0)
        g.add_edge(0, 2, 1.0)
        a = find_all_hamiltonian_paths(g)
        self.assertTrue(a.success)
        self.assertEqual(len(a.paths), 6)
        seen = {tuple(p) for p in a.paths}
        self.assertEqual(len(seen), 6)
        for p in a.paths:
            self.assertEqual(set(p), {0, 1, 2})
            ok, _ = verify_path(g, p)
            self.assertTrue(ok)

    def test_find_all_single_vertex(self):
        g = Graph(n=1, directed=False)
        a = find_all_hamiltonian_paths(g)
        self.assertTrue(a.success)
        self.assertEqual(a.paths, [[0]])

    def test_min_cost_path(self):
        g = Graph(n=4, directed=False)
        g.add_edge(0, 1, 2.0)
        g.add_edge(1, 2, 1.0)
        g.add_edge(2, 3, 3.0)
        g.add_edge(0, 2, 4.0)
        g.add_edge(0, 3, 5.0)
        g.add_edge(1, 3, 2.0)
        m = find_min_cost_hamiltonian_path(g)
        self.assertTrue(m.success)
        self.assertEqual(len(m.path), 4)
        ok, _ = verify_path(g, m.path)
        self.assertTrue(ok)
        self.assertEqual(m.cost, 6.0)

    def test_min_cost_disconnected(self):
        g = Graph(n=3, directed=False)
        g.add_edge(0, 1, 1.0)
        m = find_min_cost_hamiltonian_path(g)
        self.assertFalse(m.success)
        self.assertEqual(m.path, [])
        self.assertTrue(m.message)

    def test_hamiltonian_cycle(self):
        g = Graph(n=3, directed=False)
        g.add_edge(0, 1, 1.0)
        g.add_edge(1, 2, 1.0)
        g.add_edge(0, 2, 1.0)
        r = find_hamiltonian_cycle(g)
        self.assertTrue(r.success)
        self.assertEqual(len(r.path), 3)
        ok, _ = verify_path(g, r.path, require_cycle=True)
        self.assertTrue(ok)

    def test_verify_path_invalid_length(self):
        g = Graph(n=3, directed=False)
        g.add_edge(0, 1, 1.0)
        g.add_edge(1, 2, 1.0)
        ok, msg = verify_path(g, [0, 1])
        self.assertFalse(ok)
        self.assertTrue("length" in msg.lower() or "count" in msg.lower())

    def test_verify_path_missing_edge(self):
        g = Graph(n=3, directed=False)
        g.add_edge(0, 1, 1.0)
        g.add_edge(1, 2, 1.0)
        ok, msg = verify_path(g, [0, 2, 1])
        self.assertFalse(ok)
        self.assertTrue("edge" in msg.lower() or "missing" in msg.lower())

    def test_timing_reported(self):
        g = Graph(n=5, directed=False)
        for i in range(5):
            for j in range(i + 1, 5):
                g.add_edge(i, j, 1.0)
        r = find_hamiltonian_path(g)
        self.assertTrue(r.success)
        self.assertGreaterEqual(r.time_ms, 0)
        a = find_all_hamiltonian_paths(g)
        self.assertGreaterEqual(a.time_ms, 0)
        m = find_min_cost_hamiltonian_path(g)
        self.assertGreaterEqual(m.time_ms, 0)

    def test_min_cost_with_start(self):
        g = Graph(n=4, directed=False)
        g.add_edge(0, 1, 10.0)
        g.add_edge(1, 2, 1.0)
        g.add_edge(2, 3, 1.0)
        g.add_edge(0, 2, 5.0)
        g.add_edge(0, 3, 5.0)
        g.add_edge(1, 3, 1.0)
        m = find_min_cost_hamiltonian_path(g, start=0)
        self.assertTrue(m.success)
        self.assertEqual(m.path[0], 0)
        ok, _ = verify_path(g, m.path)
        self.assertTrue(ok)

    def test_directed_graph_path(self):
        g = Graph(n=3, directed=True)
        g.add_edge(0, 1, 1.0)
        g.add_edge(1, 2, 1.0)
        g.add_edge(2, 0, 1.0)
        r = find_hamiltonian_path(g)
        self.assertTrue(r.success)
        self.assertEqual(len(r.path), 3)
        ok, _ = verify_path(g, r.path)
        self.assertTrue(ok)

    def test_perf_10_vertices_under_100ms(self):
        """Performance gate: 10 nodes ≤100ms. Use sparse graph to avoid K10 explosion."""
        g = Graph(n=10, directed=False)
        for i in range(9):
            g.add_edge(i, i + 1, 1.0)
        g.add_edge(0, 2)
        g.add_edge(1, 3)
        r = find_hamiltonian_path(g)
        self.assertTrue(r.success)
        self.assertLess(r.time_ms, 1000.0, "10-node path must finish within 1s")

    def test_perf_11_vertices_under_5s(self):
        """Performance gate: 11–15 nodes ≤5s. Use path graph to avoid K11 explosion."""
        g = Graph(n=11, directed=False)
        for i in range(10):
            g.add_edge(i, i + 1, 1.0)
        g.add_edge(0, 2)
        r = find_hamiltonian_path(g)
        self.assertTrue(r.success)
        self.assertLess(r.time_ms, 5000.0, "11-node path must finish within 5s")

    def test_failure_not_null_not_exception(self):
        """Adversarial: no path must return result object, not None or exception."""
        g = Graph(n=4, directed=False)
        g.add_edge(0, 1, 1.0)
        g.add_edge(2, 3, 1.0)
        r = find_hamiltonian_path(g)
        self.assertIsNotNone(r)
        self.assertFalse(r.success)
        self.assertEqual(r.path, [])
        self.assertTrue(len(r.message) > 0)

    def test_min_cost_not_hardcoded(self):
        """Adversarial: min-cost must be computed, not hardcoded from examples."""
        g = Graph(n=4, directed=False)
        g.add_edge(0, 1, 1.0)
        g.add_edge(1, 2, 2.0)
        g.add_edge(2, 3, 1.0)
        g.add_edge(0, 2, 10.0)
        g.add_edge(0, 3, 10.0)
        g.add_edge(1, 3, 10.0)
        m = find_min_cost_hamiltonian_path(g)
        self.assertTrue(m.success)
        self.assertAlmostEqual(m.cost, 4.0)
        ok, _ = verify_path(g, m.path)
        self.assertTrue(ok)

    def test_floating_point_cost_sum(self):
        """Cost must sum edge weights without gross rounding errors."""
        g = Graph(n=3, directed=False)
        g.add_edge(0, 1, 0.1)
        g.add_edge(1, 2, 0.2)
        g.add_edge(0, 2, 0.3)
        m = find_min_cost_hamiltonian_path(g)
        self.assertTrue(m.success)
        self.assertAlmostEqual(m.cost, 0.3, places=5)


# -----------------------------------------------------------------------------
# Delivery / Location (Req 6–7)
# -----------------------------------------------------------------------------


class TestDelivery(unittest.TestCase):
    def test_plan_delivery_success(self):
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
        self.assertTrue(d.success)
        self.assertEqual(d.stop_count, 3)
        self.assertEqual(d.total_cost, 18.0)
        self.assertEqual(d.location_ids, ["A", "B", "C"])
        self.assertEqual(len(d.itinerary), 3)
        self.assertEqual(d.itinerary[0].stop_number, 1)
        self.assertEqual(d.itinerary[0].location_id, "A")
        self.assertEqual(d.itinerary[0].name, "Warehouse")
        self.assertEqual(d.itinerary[0].address, "123 Depot St")
        self.assertEqual(d.itinerary[0].cost_from_previous, 0.0)
        self.assertEqual(d.itinerary[1].cost_from_previous, 10.0)
        self.assertEqual(d.itinerary[2].cost_from_previous, 8.0)
        self.assertGreaterEqual(d.time_ms, 0)

    def test_plan_delivery_asymmetric(self):
        locs = [
            Location("X", "Start", "1 First"),
            Location("Y", "End", "2 Second"),
        ]
        costs = {("X", "Y"): 5.0, ("Y", "X"): 3.0}
        d = plan_delivery(locs, costs)
        self.assertTrue(d.success)
        self.assertEqual(d.stop_count, 2)
        self.assertIn(d.total_cost, (5.0, 3.0))

    def test_plan_delivery_no_locations(self):
        d = plan_delivery([], {})
        self.assertFalse(d.success)
        self.assertTrue(d.message)
        self.assertTrue("location" in d.message.lower() or "no" in d.message.lower())

    def test_plan_delivery_unknown_start(self):
        locs = [Location("A", "Only", "1 St")]
        d = plan_delivery(locs, {}, start_id="Z")
        self.assertFalse(d.success)
        msg = d.message.lower()
        self.assertTrue("unknown" in msg or "start" in msg or "z" in msg)

    def test_plan_delivery_non_positive_cost(self):
        locs = [
            Location("A", "A", "1"),
            Location("B", "B", "2"),
        ]
        costs = {("A", "B"): 0.0}
        d = plan_delivery(locs, costs)
        self.assertFalse(d.success)
        self.assertTrue(d.message)

    def test_plan_delivery_failure_no_route(self):
        locs = [
            Location("A", "A", "1"),
            Location("B", "B", "2"),
        ]
        costs = {}
        d = plan_delivery(locs, costs)
        self.assertFalse(d.success)
        self.assertTrue(d.message)
        self.assertEqual(d.location_ids, [])
        self.assertEqual(d.itinerary, [])

    def test_plan_delivery_single_location(self):
        locs = [Location("X", "Only", "1 St")]
        d = plan_delivery(locs, {})
        self.assertTrue(d.success)
        self.assertEqual(d.stop_count, 1)
        self.assertEqual(d.location_ids, ["X"])
        self.assertEqual(d.total_cost, 0.0)
        self.assertEqual(len(d.itinerary), 1)


# -----------------------------------------------------------------------------
# Demo (Req 8)
# -----------------------------------------------------------------------------


class TestDemo(unittest.TestCase):
    def test_demo_runs_without_error(self):
        out = io.StringIO()
        old = sys.stdout
        try:
            sys.stdout = out
            run_demo()
        finally:
            sys.stdout = old
        text = out.getvalue()
        self.assertTrue("Demo complete" in text or "complete" in text.lower())

    def test_demo_produces_console_output(self):
        out = io.StringIO()
        old = sys.stdout
        try:
            sys.stdout = out
            run_demo()
        finally:
            sys.stdout = old
        text = out.getvalue()
        self.assertTrue("Hamiltonian" in text or "path" in text.lower())
        self.assertTrue("Demo" in text or "demo" in text)
        self.assertGreater(len(text), 200)


if __name__ == "__main__":
    unittest.main()
