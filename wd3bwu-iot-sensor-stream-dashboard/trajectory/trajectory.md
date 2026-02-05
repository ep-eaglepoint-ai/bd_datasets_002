# Trajectory

## IoT Sensor Stream Dashboard - Full-Stack Development

### 1. System & Product Flow Audit

I began by analyzing the task requirements to understand the complete data flow from IoT sensors to the user interface. The requirements specified a real-time dashboard with 50 concurrent sparklines updating at 10Hz without dropping below 60fps, which immediately told me this would require careful architecture decisions around data buffering, WebSocket subscriptions, and frontend rendering performance. I mapped out the flow: simulated sensor data → sliding window buffer → WebSocket broadcast → Vue.js reactive store → canvas-based sparklines.

**Resources:**
- [MDN: Server-Sent Events vs WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Vue.js Reactivity In Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)

---

### 2. API & Data Contracts Design

I designed the WebSocket protocol to support viewport-based subscriptions as required. The protocol uses JSON messages with types: `subscribe`, `unsubscribe`, `setSubscriptions`, `sensorData`, and `sensorDataBatch`. For the REST API, I created endpoints for historical data (`GET /api/history/:sensorId`) and batch queries (`POST /api/history/batch`). The data contract for sensor readings includes `timestamp`, `value`, and `type` fields, ensuring consistency between the backend buffer and frontend store.

**Resources:**
- [WebSocket API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Express.js Routing Guide](https://expressjs.com/en/guide/routing.html)

---

### 3. Backend Architecture - Sliding Window Buffer

For Requirement 2 (10-minute in-memory buffer), I implemented a `SlidingWindowBuffer` class that stores data points per sensor with automatic time-based eviction. The buffer uses sorted arrays with binary search for efficient range queries (O(log n)) and maintains a maximum point count per sensor to prevent memory bloat. The eviction logic removes points older than the configured window (10 minutes) and enforces a per-sensor cap.

**Resources:**
- [Time-series Data Structures](https://www.timescale.com/blog/time-series-data/)
- [JavaScript Array Binary Search](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex)

---

### 4. Thundering Herd Protection

Requirement 4 specified handling 100 clients refreshing simultaneously. I implemented a `RequestCoalescer` class with three mechanisms: request deduplication (identical concurrent requests share a single computation), short-lived caching with TTL (1 second default), and a semaphore pattern limiting concurrent heavy operations. This ensures the system doesn't collapse under load when many clients request historical data at the same time.

**Resources:**
- [Thundering Herd Problem - Wikipedia](https://en.wikipedia.org/wiki/Thundering_herd_problem)
- [Node.js Concurrency Patterns](https://nodejs.org/en/docs/guides/blocking-vs-non-blocking/)

---

### 5. WebSocket Subscription Manager

For Requirement 3 (viewport-based subscriptions), I built a `SubscriptionManager` that maintains bidirectional maps: client-to-sensors and sensor-to-clients. This allows O(1) lookup for both subscription management and broadcast targeting. When data arrives for a sensor, only clients subscribed to that sensor receive the update, significantly reducing bandwidth for clients only viewing a subset of sensors.

**Resources:**
- [ws - WebSocket Library for Node.js](https://github.com/websockets/ws)
- [Pub/Sub Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/publisher-subscriber)

---

### 6. Frontend State Management - Performance Optimization

The Vue.js frontend uses Pinia for state management with specific optimizations for high-frequency updates. I used `reactive()` objects instead of `ref()` for sensor data to enable direct property access, implemented batch updates using `requestAnimationFrame` throttling, and used a `RingBuffer` class (fixed-size circular buffer) for sparkline data to avoid array reallocation. An `updateCounter` ref triggers computed property recalculation without deep watching the entire data store.

**Resources:**
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vue.js Performance Guide](https://vuejs.org/guide/best-practices/performance.html)

---

### 7. Canvas-Based Sparkline Rendering

For Requirement 1 (60fps with 50 sparklines at 10Hz), I chose canvas rendering over SVG or DOM-based approaches. The `Sparkline.vue` component draws directly to a canvas element using `requestAnimationFrame`-throttled updates. This avoids Vue's reactivity overhead for the actual rendering, only using Vue for prop changes. The sparkline includes dynamic scaling, threshold lines, and gradient fills while maintaining smooth performance.

**Resources:**
- [HTML Canvas API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [requestAnimationFrame Guide](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)

---

### 8. Alert Logic - Consecutive Threshold Violations

Requirement 5 specified alerts only on 3+ consecutive threshold violations. I implemented an `AlertTracker` class that maintains per-sensor state with `consecutiveViolations` counter and `isAlertActive` flag. Each sensor reading updates the counter: violations increment it, normal readings reset it to zero. The alert only activates when the counter reaches the configured threshold (3), preventing false alarms from brief spikes.

**Resources:**
- [State Machine Pattern](https://refactoring.guru/design-patterns/state)
- [JavaScript Class Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)

---

### 9. Viewport-Aware Data Subscription (Frontend)

I implemented `useViewportSubscription` composable using the Intersection Observer API to detect which sensor cards are visible. When visibility changes, the component debounces updates and sends subscription changes to the WebSocket server. This implements the client side of Requirement 3, ensuring the frontend only receives data for visible sensors, reducing CPU and memory usage for large sensor grids.

**Resources:**
- [Intersection Observer API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Vue.js Composables Guide](https://vuejs.org/guide/reusability/composables.html)

---

### 10. Test-Driven Verification

For Requirement 6 (buffer eviction test), I wrote comprehensive Jest tests including specific tests for time-based eviction and max-count eviction. The test suite covers all requirements: buffer operations (17 tests), subscription management (18 tests), thundering herd simulation with 100 concurrent requests (13 tests), and alert logic with 21 tests covering edge cases like interrupted sequences and configurable thresholds. All 96 tests pass (59 backend + 37 frontend).

**Resources:**
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest for Vue Testing](https://vitest.dev/)
- [Testing Asynchronous Code](https://jestjs.io/docs/asynchronous)
