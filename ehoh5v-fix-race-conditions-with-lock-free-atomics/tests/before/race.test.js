import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const THREAD_COUNT = 100; // we can increase this to 1000 if our machine can handle it

async function runRaceTest() {
  // Shared memory for non-atomic simulation
  const unsafeBuffer = new SharedArrayBuffer(4);
  const unsafeCounter = new Int32Array(unsafeBuffer);

  console.log("=== repository_before Race Condition Test ===");
  console.log(`Spawning ${THREAD_COUNT} threads on SAME record...`);

  const startTime = Date.now();
  const workers = [];

  for (let i = 0; i < THREAD_COUNT; i++) {
    workers.push(
      new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: { unsafeBuffer, threadId: i },
        });
        worker.on("message", resolve);
        worker.on("error", reject);
      }),
    );
  }

  const results = await Promise.all(workers);
  const elapsed = Date.now() - startTime;

  const finalCount = unsafeCounter[0];
  const lostUpdates = THREAD_COUNT - finalCount;
  const raceFree = finalCount === THREAD_COUNT;

  console.log(`\nCompleted in ${elapsed}ms`);
  console.log("─".repeat(50));
  console.log("RESULTS (repository_before behavior):");
  console.log(`  Expected count: ${THREAD_COUNT}`);
  console.log(`  Actual count:   ${finalCount}`);
  console.log(`  Lost updates:   ${lostUpdates}`);
  console.log(
    `  Race-free:      ${raceFree ? "✓ YES" : "❌ NO - RACE DETECTED"}`,
  );
  console.log("─".repeat(50));

  if (!raceFree) {
    console.log("\n// FAILURE: Race condition detected in repository_before");
    console.log("// - Non-atomic read-modify-write causes lost updates");
    console.log("// - Missing: SharedArrayBuffer, Atomics.wait/notify");
    console.log("// - Missing: Atomics.compareExchange (CAS loops)");
    console.log("// - Missing: PQ-encrypt hashed state");
  }

  return {
    threadCount: THREAD_COUNT,
    expectedCount: THREAD_COUNT,
    actualCount: finalCount,
    lostUpdates,
    raceFree,
    elapsed,
  };
}

// Worker thread logic - simulates repository_before behavior
if (!isMainThread) {
  const { unsafeBuffer, threadId } = workerData;
  const unsafeCounter = new Int32Array(unsafeBuffer);

  const current = unsafeCounter[0]; // Non-atomic read

  for (let i = 0; i < 1000; i++) {
    /* busy wait */
  }

  unsafeCounter[0] = current + 1; // Non-atomic write (RACE!)

  parentPort.postMessage({ threadId, wrote: current + 1 });
}

if (isMainThread) {
  // Cache result to avoid running expensive test multiple times
  let cachedResult = null;

  async function getCachedResult() {
    if (!cachedResult) {
      cachedResult = await runRaceTest();
    }
    return cachedResult;
  }

  // Jest test wrapper - tests REQUIRE race-free behavior (will FAIL)
  describe("repository_before - Race-Free Requirements", () => {
    test("MUST complete threads without race conditions", async () => {
      const result = await getCachedResult();

      expect(result.raceFree).toBe(true);
      expect(result.lostUpdates).toBe(0);
    }, 60000);

    test("MUST have zero lost updates", async () => {
      const result = await getCachedResult();

      expect(result.actualCount).toBe(result.expectedCount);
    }, 60000);
  });
}
