# Trajectory: Python Event Emitter Implementation

## 1. Requirements Analysis & Scope
I started by analyzing the need for a decoupled communication mechanism in Python. The goal was to build a Pub/Sub pattern implementation akin to Node.js's `EventEmitter` but tailored for Python's blocking synchronous environment.
*   **Core Needs:** Synchronous event firing, multiple listeners, one-time listeners, and safe removal mechanisms.
*   **Constraints:** Minimal external dependencies, thread-unsafe (simplified), and strict memory management to prevent leaks in long-running applications.

## 2. Core Architecture & Storage
*   **Goal:** O(1) event lookup and O(n) listener management.
*   **Strategy:** I chose a standard Python `dict` (`self._events`) where keys are event names (`str`) and values are lists of callables.
*   **Decision:** I favored a `list` over a `set` for storing listeners because **order matters**. Listeners must be notified in the sequence they subscribed (`on` time). `set` would lose this ordering.

## 3. Emission Logic & Safety
*   **Goal:** Safe iteration over listeners during emission.
*   **Challenge:** If a listener removes itself (or another listener) during an `emit()` loop, a standard iteration (`for listener in list`) would result in skipping elements or runtime errors.
*   **Solution (Snapshotting):** I implemented `listeners[:]` slicing during the `emit` loop.
    ```python
    for listener in listeners[:]:
        listener(*args, **kwargs)
    ```
*   **Reasoning:** This creates a shallow copy of the list for the duration of the loop. If `off()` is called mid-loop, it modifies the *original* list, not the one currently being iterated. This ensures the current emission cycle completes deterministically for the set of listeners that existed at the *start* of the emission.

## 4. One-Time Listeners (`once`)
*   **Goal:** Self-removing listeners.
*   **Strategy:** I used a robust **wrapper closure** pattern.
    1.  The `wrapper` function calls `self.off(event, wrapper)` first, then executes the original callback.
    2.  **Critical Detail:** I attached `wrapper._original_callback = callback` to the wrapper object.
*   **Why?** This allows the `off()` method to find and remove the listener even if the user passes the *original* function handle to `off()` instead of the wrapper (which they don't have access to). This mimics the user-friendly behavior of mature libraries.

## 5. Memory Management & Cleanup
*   **Goal:** Prevent `self._events` from accumulating empty keys over time.
*   **Strategy (Lazy Cleanup):** In the `off()` method, after removing a listener:
    ```python
    if not listeners:
        del self._events[event_name]
    ```
*   **Result:** This ensures that if a momentary high-traffic event (like `'connection'`) registers and unregisters thousands of listeners, the dictionary doesn't retain thousands of empty lists, keeping memory footprint minimal.

## 6. Introspection & Defensive Copying
*   **Goal:** Allow users to inspect listeners without breaking internal state.
*   **Implementation:** The `listeners(event)` method returns `self._events.get(event, [])[:]`.
*   **Reasoning:** Returning a copy (`[:]`) is crucial. If I returned the direct reference, a user doing `ee.listeners('data').clear()` would inadvertently wipe out the internal state of the emitter. Defensive copying prevents this class of bugs.
