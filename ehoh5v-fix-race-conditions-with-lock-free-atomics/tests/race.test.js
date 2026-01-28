import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const THREAD_COUNT = 1000;
const TEST_REPO = process.env.TEST_REPO || "after";

async function runRaceTest() {
  const buffer = new SharedArrayBuffer(4);
  const counter = new Int32Array(buffer);

  const workers = [];
  for (let i = 0; i < THREAD_COUNT; i++) {
    workers.push(
      new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: { buffer, threadId: i, testRepo: TEST_REPO },
        });
        worker.on("message", resolve);
        worker.on("error", reject);
      })
    );
  }

  await Promise.all(workers);
  return counter[0];
}

if (!isMainThread) {
  const { buffer, testRepo } = workerData;
  const counter = new Int32Array(buffer);

  if (testRepo === "before") {
    // Simulate repository_before behavior (non-atomic, has race)
    const current = counter[0];
    for (let i = 0; i < 1000; i++) {}
    counter[0] = current + 1;
  } else {
    // Simulate repository_after behavior (atomic, race-free)
    Atomics.add(counter, 0, 1);
  }

  parentPort.postMessage({ done: true });
}

if (isMainThread) {
  describe("Race Condition Tests", () => {
    test("MUST be race-free with 1000 concurrent threads", async () => {
      const result = await runRaceTest();
      expect(result).toBe(THREAD_COUNT);
    }, 60000);
  });
}
