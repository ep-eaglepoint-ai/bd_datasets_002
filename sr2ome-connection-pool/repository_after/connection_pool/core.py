"""
Core connection pool module.

This module contains a thread-safe connection pool implementation.
"""

import threading
import time
from typing import Callable, List, Optional, Any


class ConnectionPool:
    """
    Thread-safe connection pool implementation.
    
    Manages a pool of connections with configurable minimum and maximum limits.
    """
    
    def __init__(self, min_connections: int, max_connections: int,
                 connection_factory: Callable[[], Any],
                 validate: Optional[Callable[[Any], bool]] = None,
                 max_idle_time: Optional[float] = None):
        """
        Initialize the connection pool.
        
        Args:
            min_connections: Minimum number of connections to create eagerly
            max_connections: Maximum number of connections allowed
            connection_factory: Function to create new connections
            
        Raises:
            ValueError: If min_connections > max_connections
        """
        if min_connections > max_connections:
            raise ValueError("min_connections must be <= max_connections")
            
        self.min_connections = min_connections
        self.max_connections = max_connections
        self.connection_factory = connection_factory
        self._validate = validate
        self._max_idle_time = max_idle_time
        
        # Pool state protected by condition
        self._condition = threading.Condition()
        # store available as list of tuples: (connection, last_used_timestamp)
        self._available_connections: List[tuple[Any, float]] = []
        self._total_connections = 0

        self._total_created = 0
        self._total_acquisitions = 0

        self._in_use = {}
        # closed flag for shutdown semantics
        self._closed = False
        
        # Eagerly create minimum connections
        now = time.time()
        with self._condition:
            for _ in range(min_connections):
                connection = connection_factory()
                self._available_connections.append((connection, now))
                self._total_connections += 1
                self._total_created += 1
    
    def acquire(self, timeout: Optional[float] = None) -> Any:
        """
        Acquire a connection from the pool.
        
        Args:
            timeout: Maximum time to wait for a connection (None for no timeout)
            
        Returns:
            A connection from the pool
            
        Raises:
            TimeoutError: If timeout expires without acquiring a connection
        """
        # Implement acquire as a loop to avoid recursion and preserve timeout semantics
        end_time = None if timeout is None else (time.time() + timeout)

        with self._condition:
            if self._closed:
                raise RuntimeError("ConnectionPool is closed")
            while True:
                # Try to find a valid available connection
                while self._available_connections:
                    conn, last_used = self._available_connections.pop()

                    # Check idle expiration
                    if self._max_idle_time is not None and (time.time() - last_used) > self._max_idle_time:
                        # discard under lock
                        self._discard_connection(conn)
                        continue

                    # Check validation callable
                    if self._validate is not None and not self._validate(conn):
                        # discard under lock
                        self._discard_connection(conn)
                        continue

                    # Good connection
                    self._in_use[conn] = self._in_use.get(conn, 0) + 1
                    pc = PooledConnection(self, conn)
                    self._total_acquisitions += 1
                    return pc

                # Try to create a new connection if under max limit
                if self._total_connections < self.max_connections:
                    connection = self.connection_factory()
                    self._total_connections += 1
                    self._total_created += 1
                    # mark as in-use (increment count)
                    self._in_use[connection] = self._in_use.get(connection, 0) + 1
                    pc = PooledConnection(self, connection)
                    self._total_acquisitions += 1
                    return pc

                # At max capacity and no available connections, wait for one to be returned
                # compute remaining timeout
                if end_time is None:
                    remaining = None
                else:
                    remaining = end_time - time.time()
                    if remaining <= 0:
                        raise TimeoutError("Timeout waiting for connection")

                # Wait for a connection to be returned (this releases and reacquires the lock)
                self._wait_for_connection(remaining)
                # If the pool was closed while waiting, propagate
                if self._closed:
                    raise RuntimeError("ConnectionPool is closed")
                # loop continues to validate/pop/create as needed
    
    def _wait_for_connection(self, timeout: Optional[float]) -> Any:
        """
        Wait for a connection to become available.
        
        Args:
            timeout: Maximum time to wait
            
        Returns:
            A connection from the pool
            
        Raises:
            TimeoutError: If timeout expires
        """
        if timeout is None:
            # Wait indefinitely until a connection is available or pool closed
            while not self._available_connections:
                if self._closed:
                    raise RuntimeError("ConnectionPool is closed")
                self._condition.wait()
            # Do not pop here; caller will pop and validate
            return None
        else:
            # Wait with timeout
            end_time = time.time() + timeout
            while not self._available_connections:
                if self._closed:
                    raise RuntimeError("ConnectionPool is closed")
                remaining_time = end_time - time.time()
                if remaining_time <= 0:
                    raise TimeoutError("Timeout waiting for connection")
                self._condition.wait(remaining_time)
            # Do not pop here; caller will pop and validate
            return None
    
    def release(self, connection: Any) -> None:
        """
        Release a connection back to the pool.
        
        Args:
            connection: The connection to release (must be from acquire)
        """
        # Design note: this API expects callers to pass the `PooledConnection`
        # wrapper that `acquire()` returns. Accepting raw underlying connection
        # objects is intentionally disallowed to prevent callers from bypassing
        # wrapper semantics (such as `last_used` bookkeeping and idempotent
        # release). If you prefer a looser API that accepts raw connections,
        # remove the type check and adapt tests accordingly.
        if not isinstance(connection, PooledConnection):
            raise TypeError("release() expects a PooledConnection instance")

        # Ensure the wrapper belongs to this pool
        if connection._pool is not self:
            raise ValueError("PooledConnection does not belong to this pool")

        # Delegate to the wrapper which will call back to _return_connection
        connection.release()

    def _return_connection(self, connection: Any, last_used: Optional[float] = None) -> None:
        """
        Internal helper to put a raw connection back into the available list.
        Protected by the same condition/lock.
        """
        with self._condition:
            # Only return connections that are currently in-use
            count = self._in_use.get(connection, 0)
            if count <= 0:
                # ignore silently (tolerant return)
                return
            # decrement the in-use count
            if count == 1:
                del self._in_use[connection]
            else:
                self._in_use[connection] = count - 1

            # If pool is closed, close the connection instead of returning it
            if self._closed:
                # close and adjust totals
                self._close_connection_if_possible(connection)
                if self._total_connections > 0:
                    self._total_connections -= 1
                # wake up any waiters so they can see the closed state
                self._condition.notify_all()
                return

            # Add the raw connection back to available pool with timestamp
            ts = last_used if last_used is not None else time.time()
            self._available_connections.append((connection, ts))
            self._condition.notify()

    def _discard_connection(self, connection: Any) -> None:
        """Discard a connection from the pool: close if possible and adjust counts.

        Must be called with `self._condition` held.
        """
        # defensive: only discard if tracked in totals
        if self._total_connections <= 0:
            return
        self._close_connection_if_possible(connection)
        self._total_connections -= 1

    def close(self) -> None:
        """Close the pool: close all available and in-use connections.

        After calling `close()`, subsequent calls to `acquire()` will raise
        RuntimeError("ConnectionPool is closed"). This method is idempotent
        and thread-safe.
        """
        with self._condition:
            if self._closed:
                return
            self._closed = True

            # Close all available connections
            while self._available_connections:
                conn, _ = self._available_connections.pop()
                self._close_connection_if_possible(conn)

            # Close all in-use connections as best-effort
            for conn in list(self._in_use.keys()):
                try:
                    self._close_connection_if_possible(conn)
                except Exception:
                    pass

            # Clear bookkeeping
            self._in_use.clear()
            self._total_connections = 0

            # Wake all waiters so they can observe closed state
            self._condition.notify_all()

    def _close_connection_if_possible(self, connection: Any) -> None:
        """Attempt to close the connection if it exposes a close() method."""
        close = getattr(connection, "close", None)
        try:
            if callable(close):
                close()
        except Exception:
            # ignore close errors for now
            pass

    def stats(self) -> dict:
        """Return thread-safe statistics about the pool.

        Returns a dict with keys: total_created, current_pool_size,
        available_count, in_use_count, total_acquisitions
        """
        with self._condition:
            available_count = len(self._available_connections)
            in_use_count = sum(self._in_use.values())
            current_pool_size = available_count + in_use_count
            return {
                "total_created": self._total_created,
                "current_pool_size": current_pool_size,
                "available_count": available_count,
                "in_use_count": in_use_count,
                "total_acquisitions": self._total_acquisitions,
            }


class PooledConnection:
    """A thin wrapper around a raw connection that returns itself to the pool
    when used as a context manager and prevents double release.

    The wrapper exposes the underlying connection via the `connection` attribute.
    """

    def __init__(self, pool: ConnectionPool, connection: Any):
        self._pool = pool
        self.connection = connection
        # timestamp of when this pooled wrapper was last given to user
        self.last_used: float = time.time()
        self._released = False
        self._lock = threading.Lock()

    def __enter__(self):
        # mark last_used on context entry
        self.last_used = time.time()
        return self

    def __exit__(self, exc_type, exc, tb):
        # Always release, even on exception
        self.release()

    def release(self) -> None:
        """Return the underlying connection to the pool. Safe to call
        multiple times; subsequent calls are no-ops.
        """
        with self._lock:
            if self._released:
                return
            self._released = True

        # record last_used timestamp for this wrapper before returning
        self.last_used = time.time()

        # Use internal pool helper to return raw connection under the pool lock
        self._pool._return_connection(self.connection, self.last_used)

    def __repr__(self):
        return f"<PooledConnection connection={self.connection!r}>"
