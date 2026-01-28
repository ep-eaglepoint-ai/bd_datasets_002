# Trajectory

### Audit the Original Code (Problems Found)

- The original `SensorMetricsController` used a **class-level mutable field** (`cachedReadings`). In Spring MVC controllers (singleton by default) this is unsafe under concurrent requests and can leak state across calls.
- The endpoint returned a **raw `Map<String, Object>`**, which hid the API contract and made it easy to accidentally break response shape/field names.
- The implementation did extra work (including an empty nested loop), and did not guard against malformed inputs like `null` list elements (causing NPEs).

### Define the Contract (Typed Request/Response)

- Introduced **strongly typed DTOs** using Java records:
  - `SensorMetricsRequestReading(sensorId, value, timestamp)`
  - `SensorMetricsResponse(perSensor, cacheSize)` with nested `PerSensorMetrics(count, averageValue, maxReading)` and `MaxReading(sensorId, value, timestamp)`
- This preserves the existing JSON field names expected by tests (`perSensor`, `cacheSize`, `averageValue`, `maxReading`) while making the contract explicit and maintainable.

### Make Analytics Per-Request + Linear Time

- Removed shared mutable state (`cachedReadings`) so analytics are computed **only from the current request** and are safe under concurrent requests.
- Replaced the multi-map approach with a single per-sensor **`Accumulator`** stored in a `Map<String, Accumulator>` and computed in **one pass** over the input list (\(O(n)\)).

### Validate / Skip Invalid Readings (Graceful Handling)

- Added `isValidReading(...)` to gracefully handle malformed or partially invalid input:
  - skips `null` elements
  - skips missing/blank `sensorId`
  - skips `null` `value` / `timestamp`
  - skips non-finite values (NaN / Infinity)
- Only sensors with at least one valid reading are included in `perSensor`.

### Deterministic Max Tie-Break

- Implemented deterministic tie-breaking in `Accumulator.maybeUpdateMax(...)`:
  - choose higher `value`
  - if values are equal, choose the reading with the **higher timestamp**

### Edge Cases

- If the request body is missing or empty (`readings == null` or `readings.isEmpty()`), return:
  - `perSensor = {}`
  - `cacheSize = 0` (or the list size if non-null)
