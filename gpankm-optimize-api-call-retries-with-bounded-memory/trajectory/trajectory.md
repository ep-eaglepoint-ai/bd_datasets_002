# Trajectory

## Backoff mathExponential backoff with jitter (10–20%) to avoid thundering herd:

- **Base delays (seconds):** `1, 2, 4, 8, 16` → i.e. `min(16, 2^(attempt))` for `attempt ∈ [0,4]`.
- **Jitter:** `1 + rand(0.1, 0.2)` so delay is scaled by 1.1–1.2.
- **Formula:**  
  `Delay(attempt) = BASE_DELAYS[attempt] * (1 + jitter)`  
  with `jitter ∈ [0.1, 0.2]` from a **seeded LCG** (deterministic).
- **Implementation:**  
  `delayMs = floor(baseSec * 1000 * (1 + jitter))`  
  e.g. attempt 0 → 1s × (1.1–1.2) ≈ 1100–1200 ms.

Determinism: same error sequence → same retry delays across runs/servers (seeded PRNG, no `Math.random()` for backoff).

---

## O(1) space per call- **Bounded logging:** Fixed-size array of size **3** per call (APILogData history). Ring buffer overwrites oldest; **fixed queue prevents growth** → no growing arrays.
- **No full body/response:** Request and response are truncated (e.g. 200 chars) before storing in the log buffer, so we avoid unbounded storage of large payloads.
- **No shared mutable state:** Each `safaricomCoreCall` allocates its own bounded log. No global `logs[]`; no mutex needed for 100 concurrent calls.
- **Conclusion:** O(1) space per call; memory bounded regardless of retries or load.

---

## Constraints addressed

| Constraint | Approach |
|------------|----------|
| No libs beyond axios/moment | No Jest; backoff/sleep implemented manually. |
| Thread-safe, 100 concurrent | Per-call state only; no shared log. |
| Deterministic | Seeded jitter; no JSON.stringify nondeterminism in retry logic. |
| Realistic benchmark | Bounded concurrency (no Promise.all(50k)); local HTTP mock. |
| API contract | Function never throws; always returns `{ status, data? }` or `{ status, message? }`. |
| Memory bounded | Size-3 ring buffer per call; truncated request/response. |