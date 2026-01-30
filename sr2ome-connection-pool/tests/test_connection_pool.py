"""Tests for the connection pool module."""

import threading
import time
from unittest.mock import MagicMock

import pytest

from connection_pool.core import ConnectionPool


class TestConnectionPool:
    """Test cases for ConnectionPool."""

    def test_min_max_validation(self):
        """Test that min_connections must be <= max_connections."""
        with pytest.raises(ValueError, match="min_connections must be <= max_connections"):
            ConnectionPool(5, 3, MagicMock)

    def test_eager_creation(self):
        """Test that min_connections are created eagerly."""
        factory = MagicMock()
        factory.return_value = f"connection_{factory.call_count}"

        pool = ConnectionPool(3, 5, factory)

        # Should have created exactly 3 connections
        assert factory.call_count == 3
        assert pool._total_connections == 3
        assert len(pool._available_connections) == 3
        s = pool.stats()
        assert s["total_created"] == 3
        assert s["current_pool_size"] == 3
        assert s["available_count"] == 3
        assert s["in_use_count"] == 0
        assert s["total_acquisitions"] == 0

    def test_acquire_available_connection(self):
        """Test acquiring from available connections."""
        call_counter = [0]

        def factory():
            conn = f"connection_{call_counter[0]}"
            call_counter[0] += 1
            return conn

        pool = ConnectionPool(2, 5, factory)

        # Acquire a connection
        conn1 = pool.acquire()
        assert conn1.connection in ["connection_0", "connection_1"]
        assert pool._total_connections == 2
        assert len(pool._available_connections) == 1

        # Acquire another connection
        conn2 = pool.acquire()
        assert conn2.connection in ["connection_0", "connection_1"]
        assert conn1.connection != conn2.connection  # Should be different connections
        assert pool._total_connections == 2
        assert len(pool._available_connections) == 0

    def test_acquire_creates_new_connection_under_max(self):
        """Test that acquire creates new connections when under max limit."""
        call_counter = [0]

        def factory():
            conn = f"connection_{call_counter[0]}"
            call_counter[0] += 1
            return conn

        pool = ConnectionPool(1, 3, factory)

        # Acquire the initial connection
        conn1 = pool.acquire()
        assert conn1.connection == "connection_0"
        assert call_counter[0] == 1

        # Acquire again - should create new connection
        conn2 = pool.acquire()
        assert conn2.connection == "connection_1"
        assert call_counter[0] == 2
        assert pool._total_connections == 2
        assert len(pool._available_connections) == 0

    def test_max_connections_enforcement(self):
        """Test that pool never exceeds max_connections."""
        factory = MagicMock()
        factory.return_value = f"connection_{factory.call_count}"

        pool = ConnectionPool(1, 2, factory)

        # Acquire all possible connections
        conn1 = pool.acquire()
        conn2 = pool.acquire()

        # Should have created exactly max_connections
        assert factory.call_count == 2
        assert pool._total_connections == 2
        assert len(pool._available_connections) == 0

    def test_release_connection(self):
        """Test releasing connections back to pool."""
        factory = MagicMock()
        factory.return_value = f"connection_{factory.call_count}"

        pool = ConnectionPool(1, 3, factory)

        # Acquire and release
        conn = pool.acquire()
        assert len(pool._available_connections) == 0

        pool.release(conn)
        assert len(pool._available_connections) == 1
        assert pool._available_connections[0][0] == conn.connection

    def test_blocking_behavior(self):
        """Test that acquire blocks when pool is at max capacity."""
        factory = MagicMock()
        factory.return_value = f"connection_{factory.call_count}"

        pool = ConnectionPool(1, 2, factory)

        # Acquire all connections
        conn1 = pool.acquire()
        conn2 = pool.acquire()

        # Try to acquire in another thread - should block
        acquired_connection = None
        block_started = threading.Event()

        def acquire_connection():
            nonlocal acquired_connection
            block_started.set()
            acquired_connection = pool.acquire()

        thread = threading.Thread(target=acquire_connection)
        thread.start()

        # Wait for thread to start blocking
        block_started.wait()
        time.sleep(0.1)  # Give it time to block

        # Should still be blocked
        assert acquired_connection is None
        assert thread.is_alive()

        # Release a connection
        pool.release(conn1)

        # Thread should now unblock and get the connection
        thread.join(timeout=1.0)
        assert not thread.is_alive()
        assert acquired_connection.connection == conn1.connection

    def test_timeout_behavior(self):
        """Test that acquire raises TimeoutError when timeout expires."""
        factory = MagicMock()
        factory.return_value = f"connection_{factory.call_count}"

        pool = ConnectionPool(1, 2, factory)

        # Acquire all connections
        conn1 = pool.acquire()
        conn2 = pool.acquire()

        # Try to acquire with timeout - should raise TimeoutError
        start_time = time.time()
        with pytest.raises(TimeoutError, match="Timeout waiting for connection"):
            pool.acquire(timeout=0.1)

        # Should have waited approximately the timeout duration
        elapsed = time.time() - start_time
        assert 0.08 <= elapsed <= 0.2  # Allow some variance

    def test_concurrent_acquisition_release(self):
        """Test concurrent acquisition and release with multiple threads."""
        factory = MagicMock()
        factory.return_value = f"connection_{factory.call_count}"

        pool = ConnectionPool(2, 4, factory)

        results = []
        errors = []

        def worker(thread_id):
            try:
                # Acquire connection
                conn = pool.acquire(timeout=1.0)
                results.append(f"thread_{thread_id}_got_{conn.connection}")

                # Hold for a short time
                time.sleep(0.05)

                # Release connection
                pool.release(conn)
                results.append(f"thread_{thread_id}_released_{conn.connection}")
            except Exception as e:
                errors.append(f"thread_{thread_id}_error: {e}")

        # Start multiple threads
        threads = []
        for i in range(6):  # More threads than max connections
            thread = threading.Thread(target=worker, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join(timeout=2.0)

        # Should have no errors
        assert len(errors) == 0, f"Errors occurred: {errors}"

        # Should have results from all threads
        assert len(results) == 12  # 6 threads * 2 operations each

        # Should not exceed max connections
        assert factory.call_count <= 4
        assert pool._total_connections <= 4
        s = pool.stats()
        assert s["total_acquisitions"] >= 6
        assert s["in_use_count"] == 0

    def test_no_timeout_blocking_indefinitely(self):
        """Test that acquire with timeout=None blocks indefinitely until connection available."""
        factory = MagicMock()
        factory.return_value = f"connection_{factory.call_count}"

        pool = ConnectionPool(1, 2, factory)

        # Acquire all connections
        conn1 = pool.acquire()
        conn2 = pool.acquire()

        # Try to acquire without timeout in another thread
        acquired_connection = None
        block_started = threading.Event()

        def acquire_without_timeout():
            nonlocal acquired_connection
            block_started.set()
            acquired_connection = pool.acquire()  # No timeout

        thread = threading.Thread(target=acquire_without_timeout)
        thread.start()

        # Wait for thread to start blocking
        block_started.wait()
        time.sleep(0.1)

        # Should still be blocked
        assert acquired_connection is None
        assert thread.is_alive()

        # Release connection after a delay
        time.sleep(0.1)
        pool.release(conn1)

        # Thread should unblock
        thread.join(timeout=1.0)
        assert not thread.is_alive()
        assert acquired_connection.connection == conn1.connection


def test_connection_pool_import():
    """Test that the connection pool can be imported."""
    from connection_pool.core import ConnectionPool

    # Test that we can create an instance
    pool = ConnectionPool(1, 2, MagicMock)
    assert pool is not None


def test_package_version():
    """Test that the package has a version."""
    import connection_pool

    assert hasattr(connection_pool, '__version__')
    assert connection_pool.__version__ == "0.1.0"


def test_context_manager_automatic_release_normal_exit():
    """PooledConnection should be returned to the pool on normal context exit."""
    factory = MagicMock()
    factory.return_value = f"connection_{factory.call_count}"

    pool = ConnectionPool(1, 2, factory)

    with pool.acquire() as pc:
        # while inside context, connection should be checked out
        assert len(pool._available_connections) == 0
        conn_underlying = pc.connection

    # after exit, the underlying connection should be back
    assert len(pool._available_connections) == 1
    assert pool._available_connections[0][0] == conn_underlying


def test_context_manager_automatic_release_on_exception():
    """PooledConnection should be returned to the pool even when exception occurs."""
    factory = MagicMock()
    factory.return_value = f"connection_{factory.call_count}"

    pool = ConnectionPool(1, 2, factory)

    try:
        with pool.acquire() as pc:
            raise RuntimeError("boom")
    except RuntimeError:
        pass

    assert len(pool._available_connections) == 1


def test_connection_reusable_after_context_exit():
    """Underlying connection should be reusable after context manager exit."""
    call_counter = [0]

    def factory():
        conn = f"connection_{call_counter[0]}"
        call_counter[0] += 1
        return conn

    pool = ConnectionPool(1, 2, factory)

    with pool.acquire() as pc:
        conn_underlying = pc.connection

    # Acquire again and ensure the underlying connection is the same
    new_pc = pool.acquire()
    assert new_pc.connection == conn_underlying
    pool.release(new_pc)


def test_stats_after_acquire_release():
    factory = MagicMock()
    factory.return_value = f"connection_{factory.call_count}"

    pool = ConnectionPool(2, 3, factory)
    s0 = pool.stats()
    assert s0["total_created"] == 2

    # Acquire two
    pc1 = pool.acquire()
    pc2 = pool.acquire()
    s1 = pool.stats()
    assert s1["in_use_count"] == 2
    assert s1["available_count"] == 0
    assert s1["total_acquisitions"] == 2

    # Release one
    pool.release(pc1)
    s2 = pool.stats()
    assert s2["in_use_count"] == 1
    assert s2["available_count"] == 1



def test_validation_failure_replacement():
    """If validate returns False the pool should discard and replace the connection."""

    class Conn:
        def __init__(self, ok):
            self.ok = ok
            self.closed = False
        def close(self):
            self.closed = True

    created = [Conn(False), Conn(True)]
    def factory():
        return created.pop(0)

    def validate(c):
        return getattr(c, "ok", True)

    pool = ConnectionPool(1, 1, factory, validate=validate)

    pc = pool.acquire()
    # should have gotten the second (valid) connection
    assert pc.connection.ok is True
    # the first connection should have been closed
    assert created == []


def test_idle_timeout_replacement():
    """Connections idle longer than max_idle_time should be discarded and replaced."""

    class Conn:
        def __init__(self, id_):
            self.id = id_
            self.closed = False
        def close(self):
            self.closed = True

    objs = [Conn(0), Conn(1)]
    def factory():
        return objs.pop(0)

    pool = ConnectionPool(1, 1, factory, max_idle_time=0.01)

    pc = pool.acquire()
    underlying = pc.connection
    pool.release(pc)

    # artificially age the available connection
    conn, ts = pool._available_connections.pop()
    old_ts = ts - 10.0
    pool._available_connections.append((conn, old_ts))

    # Next acquire should replace the old connection
    new_pc = pool.acquire()
    assert new_pc.connection is not underlying
    # old one should have been closed
    assert underlying.closed is True


def test_last_used_updates_on_enter_and_release():
    """PooledConnection.last_used updates on __enter__ and on release."""

    call_counter = [0]
    def factory():
        conn = f"connection_{call_counter[0]}"
        call_counter[0] += 1
        return conn

    pool = ConnectionPool(1, 1, factory)

    pc = pool.acquire()
    time.sleep(0.01)
    t_before = time.time()
    with pc as p_in:
        # the wrapper should record its `last_used` on __enter__
        assert p_in.last_used >= t_before
    # after release, available entry should have a timestamp
    assert len(pool._available_connections) == 1
    conn, ts = pool._available_connections[0]
    # the pool-owned timestamp should be at least the wrapper's last_used
    assert ts >= p_in.last_used


def test_stats_after_discard_and_replace():
    class Conn:
        def __init__(self, ok):
            self.ok = ok
            self.closed = False
        def close(self):
            self.closed = True

    created = [Conn(False), Conn(True)]
    def factory():
        return created.pop(0)

    def validate(c):
        return getattr(c, "ok", True)

    pool = ConnectionPool(1, 1, factory, validate=validate)
    s0 = pool.stats()
    assert s0["total_created"] == 1

    pc = pool.acquire()
    # acquire should have discarded first and created second
    s1 = pool.stats()
    assert s1["total_created"] >= 2
    assert s1["in_use_count"] == 1


def test_acquire_after_close():
    """After close(), acquire() should raise a clear exception."""
    factory = MagicMock()
    factory.return_value = f"connection_{factory.call_count}"

    pool = ConnectionPool(1, 2, factory)
    pool.close()

    with pytest.raises(RuntimeError, match="closed"):
        pool.acquire()


def test_release_after_close_closes_connection():
    """Releasing a checked-out connection after close() should close it."""
    class Conn:
        def __init__(self):
            self.closed = False
        def close(self):
            self.closed = True

    def factory():
        return Conn()

    pool = ConnectionPool(1, 2, factory)
    pc = pool.acquire()
    underlying = pc.connection

    # Close the pool while connection is checked out
    pool.close()

    # Releasing after close should close the underlying connection
    pool.release(pc)
    assert underlying.closed is True


def test_close_closes_all_connections():
    """close() should close both available and in-use connections."""
    class Conn:
        def __init__(self):
            self.closed = False
        def close(self):
            self.closed = True

    objs = [Conn(), Conn()]
    def factory():
        return objs.pop(0)

    pool = ConnectionPool(2, 2, factory)

    # Acquire one so it's in-use, one remains available
    pc = pool.acquire()
    # snapshot underlying objects
    in_use_conn = pc.connection
    avail_conn, _ = pool._available_connections.pop()
    pool._available_connections.append((avail_conn, time.time()))

    pool.close()

    # both should be closed
    assert in_use_conn.closed is True
    assert avail_conn.closed is True
    assert pool._total_connections == 0
    assert len(pool._available_connections) == 0
    assert sum(pool._in_use.values()) == 0
