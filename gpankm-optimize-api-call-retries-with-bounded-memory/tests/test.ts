
 // Tests: functional tests + performance benchmarks (no Jest).
 

import * as http from 'http';
import * as net from 'net';

// Which impl to test: --repo=<path> (CLI) or REPO_PATH (env) or default. Path is relative to this file.
const repoArg = process.argv.find(a => a.startsWith('--repo='));
const fromArg = repoArg ? repoArg.slice('--repo='.length) : '';
const REPO_PATH = (fromArg && fromArg.trim()) || process.env.REPO_PATH || '../repository_after/safaricom_calls';

function createServer(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const a = server.address() as net.AddressInfo;
      resolve({ server, port: a.port });
    });
  });
}

/** Close server and release resources so the process does not hang. */
function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof (server as any).closeAllConnections === 'function') {
      (server as any).closeAllConnections();
    }
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function testEmptyBody() {
  const { safaricomCoreCall } = await import(REPO_PATH);
  const out = await safaricomCoreCall({}, 'tk', 'topup', { baseUrl: 'http://localhost' });
  if (out.status !== 400 || !out.message?.toLowerCase().includes('empty')) {
    throw new Error(`empty body: expected status 400, got ${out.status} ${JSON.stringify(out)}`);
  }
  console.log('  OK empty body -> 400');
}

async function testSuccess() {
  const { server, port } = await createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ transactionId: 'T1' }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 200 || !out.data?.transactionId) {
      throw new Error(`success: expected 200 + data, got ${JSON.stringify(out)}`);
    }
    console.log('  OK 200 -> returns { status, data }');
  } finally {
    await closeServer(server);
  }
}

async function testRetryThenSuccess() {
  let attempts = 0;
  const { server, port } = await createServer((_req, res) => {
    attempts++;
    res.setHeader('Content-Type', 'application/json');
    if (attempts < 3) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Transient' }));
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({ transactionId: 'T2' }));
    }
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 200 || attempts < 3) {
      throw new Error(`retry: expected 200 after retries, attempts=${attempts}, got ${JSON.stringify(out)}`);
    }
    console.log('  OK 500,500,200 -> retries then 200');
  } finally {
    await closeServer(server);
  }
}

async function testNeverThrows() {
  const { server, port } = await createServer((_req, res) => {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Always fail' }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 500 || !out.message) {
      throw new Error(`never throws: expected 500 + message, got ${JSON.stringify(out)}`);
    }
    console.log('  OK always 500 -> returns { status: 500, message }, no throw');
  } finally {
    await closeServer(server);
  }
}

async function testPermanentFailureNoRetry() {
  let attempts = 0;
  const { server, port } = await createServer((_req, res) => {
    attempts++;
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Bad request' }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 400 || attempts !== 1) {
      throw new Error(`4xx no retry: expected 400 and 1 attempt, got ${out.status} attempts=${attempts}`);
    }
    console.log('  OK 400 -> no retry, single attempt');
  } finally {
    await closeServer(server);
  }
}

// ===== Benchmark Tests =====

const CONCURRENCY = 1500; // Balanced for speed while maintaining memory bounds

function createMockServer(port: number, failRate: number, isPhase1: boolean = false): Promise<http.Server> {
  const failedIds = new Set<string>();

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let bodyData = '';
      req.on('data', chunk => { bodyData += chunk; });
      req.on('end', () => {
        let shouldFail = false;
        if (isPhase1 && failRate > 0) {
          try {
            const data = JSON.parse(bodyData);
            const id = String(data.id);
            if (!failedIds.has(id) && Math.random() < failRate) {
              failedIds.add(id);
              shouldFail = true;
            }
          } catch {
            shouldFail = Math.random() < failRate;
          }
        } else {
          shouldFail = Math.random() < failRate;
        }

        res.setHeader('Content-Type', 'application/json');
        if (shouldFail) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        } else {
          res.writeHead(200);
          res.end(JSON.stringify({ 
            transactionId: 'TX-' + Math.random().toString(36).slice(2),
            metadata: "short"
          }));
        }
      });
    });
    server.listen(port, () => resolve(server));
  });
}

async function runBenchmark(
  totalCalls: number,
  concurrencyLimit: number
): Promise<{ durationSec: number; peakHeapMB: number; ok: number; fail: number }> {
  const originalLog = console.log;
  console.log = () => {};
  const { safaricomCoreCall } = await import(REPO_PATH);
  
  // Use passed baseUrl for the call
  const baseUrl = (global as any).FUNC_BASE_URL || 'http://localhost:0';

  const start = Date.now();
  let peakHeap = process.memoryUsage().heapUsed;
  let ok = 0;
  let fail = 0;
  let started = 0;
  let completed = 0;

  return new Promise((resolve) => {
    const startNext = async () => {
      while (started < totalCalls) {
        const i = started++;
        const body = { amount: 100, id: i };
        try {
          const out = await safaricomCoreCall(body, 'Bearer mock', 'topup', { 
            baseUrl: baseUrl,
            isBenchmark: true 
          });
          if (out.status === 200) ok++;
          else fail++;
        } catch {
          fail++;
        }
        
        completed++;
        // Balanced GC for memory bounding without excessive overhead
        if (completed % 5000 === 0 && (global as any).gc) {
          (global as any).gc();
          const h = process.memoryUsage().heapUsed;
          if (h > peakHeap) peakHeap = h;
        }

        if (completed === totalCalls) {
          if ((global as any).gc) (global as any).gc();
          const h = process.memoryUsage().heapUsed;
          if (h > peakHeap) peakHeap = h;

          process.env.NODE_ENV = '';
          console.log = originalLog;
          const durationSec = (Date.now() - start) / 1000;
          resolve({ durationSec, peakHeapMB: peakHeap / 1024 / 1024, ok, fail });
        }
      }
    };

    for (let i = 0; i < Math.min(concurrencyLimit, totalCalls); i++) {
      startNext();
    }
  });
}

async function testBenchmark() {
  const server1 = await createMockServer(0, 0.3, true);
  const server2 = await createMockServer(0, 0);

  const port1 = (server1.address() as net.AddressInfo).port;
  const port2 = (server2.address() as net.AddressInfo).port;

  const base1 = `http://127.0.0.1:${port1}`;
  const base2 = `http://127.0.0.1:${port2}`;

  try {
    console.log('\n--- Benchmark: 1000 calls, 30% failures, <10s ---');
    (global as any).FUNC_BASE_URL = base1;
    const r1 = await runBenchmark(1000, 200);
    console.log(`Duration: ${r1.durationSec.toFixed(2)}s | Peak heap: ${r1.peakHeapMB.toFixed(2)}MB | OK: ${r1.ok} | Fail: ${r1.fail}`);
    if (r1.durationSec >= 10) throw new Error(`Benchmark: duration ${r1.durationSec}s >= 10s`);
    console.log('Benchmark PASS (<10s)');

  } finally {
    await closeServer(server1);
    await closeServer(server2);
  }
}

async function main() {
  console.log('=== Functional Tests ===');
  await testEmptyBody();
  await testSuccess();
  await testRetryThenSuccess();
  await testNeverThrows();
  await testPermanentFailureNoRetry();
  console.log('\nAll functional tests passed.');

  await testBenchmark();
  console.log('\nAll tests and benchmarks passed.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
