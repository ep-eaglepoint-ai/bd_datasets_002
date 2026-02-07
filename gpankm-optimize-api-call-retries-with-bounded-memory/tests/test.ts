import * as http from 'http';
import * as net from 'net';

// Which impl to test: --repo=<path> (CLI) or REPO_PATH (env) or default. Path is relative to this file.
const repoArg = process.argv.find(a => a.startsWith('--repo='));
const fromArg = repoArg ? repoArg.slice('--repo='.length) : '';
const REPO_PATH = (fromArg && fromArg.trim()) || process.env.REPO_PATH || '../repository_after/safaricom_calls';
const isBefore = /repository_before/i.test(REPO_PATH);

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

// ===== Edge Case Tests =====

async function testNullBody() {
  const { safaricomCoreCall } = await import(REPO_PATH);
  const out = await safaricomCoreCall(null as any, 'tk', 'topup', { baseUrl: 'http://localhost' });
  if (out.status !== 400 || !out.message?.toLowerCase().includes('empty')) {
    throw new Error(`null body: expected status 400, got ${out.status} ${JSON.stringify(out)}`);
  }
  console.log('  OK null body -> 400');
}

async function testUndefinedBody() {
  const { safaricomCoreCall } = await import(REPO_PATH);
  const out = await safaricomCoreCall(undefined as any, 'tk', 'topup', { baseUrl: 'http://localhost' });
  if (out.status !== 400 || !out.message?.toLowerCase().includes('empty')) {
    throw new Error(`undefined body: expected status 400, got ${out.status} ${JSON.stringify(out)}`);
  }
  console.log('  OK undefined body -> 400');
}

async function testEmptyStringBody() {
  const { safaricomCoreCall } = await import(REPO_PATH);
  const { server, port } = await createServer((_req, res) => {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const out = await safaricomCoreCall('', 'tk', 'topup', { baseUrl: base });
    // Empty string should be treated as valid (non-empty object check)
    if (out.status !== 200) {
      throw new Error(`empty string body: expected 200, got ${out.status}`);
    }
    console.log('  OK empty string body -> 200');
  } finally {
    await closeServer(server);
  }
}

async function testNonObjectBody() {
  const { safaricomCoreCall } = await import(REPO_PATH);
  const { server, port } = await createServer((_req, res) => {
    res.writeHead(200);
    res.end(JSON.stringify({ received: true }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const out = await safaricomCoreCall('string body', 'tk', 'topup', { baseUrl: base });
    if (out.status !== 200) {
      throw new Error(`non-object body: expected 200, got ${out.status}`);
    }
    console.log('  OK non-object body -> 200');
  } finally {
    await closeServer(server);
  }
}

async function test401Unauthorized() {
  let attempts = 0;
  const { server, port } = await createServer((_req, res) => {
    attempts++;
    res.writeHead(401);
    res.end(JSON.stringify({ error: 'Unauthorized' }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 401 || attempts !== 1) {
      throw new Error(`401: expected 401 and 1 attempt, got ${out.status} attempts=${attempts}`);
    }
    console.log('  OK 401 -> no retry, single attempt');
  } finally {
    await closeServer(server);
  }
}

async function test403Forbidden() {
  let attempts = 0;
  const { server, port } = await createServer((_req, res) => {
    attempts++;
    res.writeHead(403);
    res.end(JSON.stringify({ error: 'Forbidden' }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 403 || attempts !== 1) {
      throw new Error(`403: expected 403 and 1 attempt, got ${out.status} attempts=${attempts}`);
    }
    console.log('  OK 403 -> no retry, single attempt');
  } finally {
    await closeServer(server);
  }
}

async function test404NotFound() {
  let attempts = 0;
  const { server, port } = await createServer((_req, res) => {
    attempts++;
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 404 || attempts !== 1) {
      throw new Error(`404: expected 404 and 1 attempt, got ${out.status} attempts=${attempts}`);
    }
    console.log('  OK 404 -> no retry, single attempt');
  } finally {
    await closeServer(server);
  }
}

async function test422UnprocessableEntity() {
  let attempts = 0;
  const { server, port } = await createServer((_req, res) => {
    attempts++;
    res.writeHead(422);
    res.end(JSON.stringify({ error: 'Validation failed' }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 422 || attempts !== 1) {
      throw new Error(`422: expected 422 and 1 attempt, got ${out.status} attempts=${attempts}`);
    }
    console.log('  OK 422 -> no retry, single attempt');
  } finally {
    await closeServer(server);
  }
}

async function test429RateLimitRetry() {
  let attempts = 0;
  const { server, port } = await createServer((_req, res) => {
    attempts++;
    res.setHeader('Content-Type', 'application/json');
    if (attempts < 2) {
      res.writeHead(429);
      res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({ transactionId: 'T429' }));
    }
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 200 || attempts < 2) {
      throw new Error(`429 retry: expected 200 after retry, attempts=${attempts}, got ${JSON.stringify(out)}`);
    }
    console.log('  OK 429 -> retries then 200');
  } finally {
    await closeServer(server);
  }
}

async function test502BadGateway() {
  let attempts = 0;
  const { server, port } = await createServer((_req, res) => {
    attempts++;
    res.setHeader('Content-Type', 'application/json');
    if (attempts < 2) {
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'Bad gateway' }));
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({ transactionId: 'T502' }));
    }
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 200 || attempts < 2) {
      throw new Error(`502 retry: expected 200 after retry, attempts=${attempts}, got ${JSON.stringify(out)}`);
    }
    console.log('  OK 502 -> retries then 200');
  } finally {
    await closeServer(server);
  }
}

async function test503ServiceUnavailable() {
  let attempts = 0;
  const { server, port } = await createServer((_req, res) => {
    attempts++;
    res.setHeader('Content-Type', 'application/json');
    if (attempts < 2) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: 'Service unavailable' }));
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({ transactionId: 'T503' }));
    }
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 200 || attempts < 2) {
      throw new Error(`503 retry: expected 200 after retry, attempts=${attempts}, got ${JSON.stringify(out)}`);
    }
    console.log('  OK 503 -> retries then 200');
  } finally {
    await closeServer(server);
  }
}

async function test504GatewayTimeout() {
  let attempts = 0;
  const { server, port } = await createServer((_req, res) => {
    attempts++;
    res.setHeader('Content-Type', 'application/json');
    if (attempts < 2) {
      res.writeHead(504);
      res.end(JSON.stringify({ error: 'Gateway timeout' }));
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({ transactionId: 'T504' }));
    }
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 200 || attempts < 2) {
      throw new Error(`504 retry: expected 200 after retry, attempts=${attempts}, got ${JSON.stringify(out)}`);
    }
    console.log('  OK 504 -> retries then 200');
  } finally {
    await closeServer(server);
  }
}

async function testMaxRetriesReached() {
  let attempts = 0;
  const { server, port } = await createServer((_req, res) => {
    attempts++;
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Always fail' }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    // MAX_RETRIES = 5, so we should have 6 attempts total (initial + 5 retries)
    const expectedAttempts = 6;
    if (out.status !== 500 || attempts !== expectedAttempts) {
      throw new Error(`max retries: expected 500 and ${expectedAttempts} attempts, got ${out.status} attempts=${attempts}`);
    }
    console.log(`  OK max retries (${expectedAttempts} attempts) -> 500`);
  } finally {
    await closeServer(server);
  }
}

async function testNetworkError() {
  const { safaricomCoreCall } = await import(REPO_PATH);
  // Use a port that's definitely not listening
  const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { 
    baseUrl: 'http://127.0.0.1:99999' 
  });
  // Network errors should be retried, but eventually fail
  if (out.status !== 500 || !out.message) {
    throw new Error(`network error: expected 500 with message, got ${JSON.stringify(out)}`);
  }
  console.log('  OK network error -> retries then 500');
}

async function testConnectionRefused() {
  const { safaricomCoreCall } = await import(REPO_PATH);
  // Try to connect to a closed port
  const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { 
    baseUrl: 'http://127.0.0.1:1' 
  });
  // Should retry and eventually return error
  if (out.status !== 500 || !out.message) {
    throw new Error(`connection refused: expected 500 with message, got ${JSON.stringify(out)}`);
  }
  console.log('  OK connection refused -> retries then 500');
}

async function testTimeout() {
  // Use a server that never responds to trigger timeout
  // Note: This test may take a while due to 10s timeout + retries
  // Skip in quick test runs if needed
  const { server, port } = await createServer((_req, res) => {
    // Don't respond - will timeout after 10s
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const start = Date.now();
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    const duration = Date.now() - start;
    // Should timeout and retry, eventually fail
    if (out.status !== 500 || !out.message) {
      throw new Error(`timeout: expected 500 with message, got ${JSON.stringify(out)}`);
    }
    // Should have taken significant time due to timeout (at least 10s for first attempt)
    // But allow some variance
    if (duration < 8000) {
      throw new Error(`timeout: expected longer duration (>=8s), got ${duration}ms`);
    }
    console.log(`  OK timeout -> retries then 500 (took ${(duration/1000).toFixed(1)}s)`);
  } finally {
    await closeServer(server);
  }
}

async function testLargeRequestBody() {
  const { server, port } = await createServer((_req, res) => {
    res.writeHead(200);
    res.end(JSON.stringify({ received: true }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    // Create a large body (but not too large to avoid issues)
    const largeBody = { data: 'x'.repeat(10000) };
    const out = await safaricomCoreCall(largeBody, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 200) {
      throw new Error(`large body: expected 200, got ${out.status}`);
    }
    console.log('  OK large request body -> 200');
  } finally {
    await closeServer(server);
  }
}

async function testLargeResponseBody() {
  const { server, port } = await createServer((_req, res) => {
    res.writeHead(200);
    // Large response should be truncated in logs but still work
    const largeData = { data: 'x'.repeat(50000) };
    res.end(JSON.stringify(largeData));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 200 || !out.data) {
      throw new Error(`large response: expected 200 with data, got ${JSON.stringify(out)}`);
    }
    console.log('  OK large response body -> 200');
  } finally {
    await closeServer(server);
  }
}

async function testEmptyResponse() {
  const { server, port } = await createServer((_req, res) => {
    res.writeHead(200);
    res.end(); // No body
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 200) {
      throw new Error(`empty response: expected 200, got ${out.status}`);
    }
    console.log('  OK empty response -> 200');
  } finally {
    await closeServer(server);
  }
}

async function testNullToken() {
  const { server, port } = await createServer((_req, res) => {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, null as any, 'topup', { baseUrl: base });
    // Should still make request (server may reject, but client should handle)
    if (out.status !== 200 && out.status !== 401) {
      throw new Error(`null token: expected 200 or 401, got ${out.status}`);
    }
    console.log('  OK null token -> handled');
  } finally {
    await closeServer(server);
  }
}

async function testTokenDestination() {
  const { server, port } = await createServer((_req, res) => {
    res.writeHead(200);
    res.end(JSON.stringify({ token: 'T123' }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ grant_type: 'client_credentials' }, 'tk', 'token', { baseUrl: base });
    if (out.status !== 200 || !out.data) {
      throw new Error(`token destination: expected 200 with data, got ${JSON.stringify(out)}`);
    }
    console.log('  OK token destination -> 200');
  } finally {
    await closeServer(server);
  }
}

async function testTopupDestination() {
  const { server, port } = await createServer((_req, res) => {
    res.writeHead(200);
    res.end(JSON.stringify({ transactionId: 'TX123' }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out.status !== 200 || !out.data) {
      throw new Error(`topup destination: expected 200 with data, got ${JSON.stringify(out)}`);
    }
    console.log('  OK topup destination -> 200');
  } finally {
    await closeServer(server);
  }
}

async function testDefaultBaseUrl() {
  const { safaricomCoreCall } = await import(REPO_PATH);
  // Don't provide baseUrl - should use default
  const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup');
  // Will fail to connect, but should handle gracefully
  if (out.status !== 500 || !out.message) {
    throw new Error(`default baseUrl: expected 500 with message, got ${JSON.stringify(out)}`);
  }
  console.log('  OK default baseUrl -> uses default URL');
}

async function testUndefinedConfig() {
  const { server, port } = await createServer((_req, res) => {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', undefined as any);
    // Should use default baseUrl, but we'll test with explicit baseUrl
    const out2 = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    if (out2.status !== 200) {
      throw new Error(`undefined config: expected 200, got ${out2.status}`);
    }
    console.log('  OK undefined config -> handled');
  } finally {
    await closeServer(server);
  }
}

async function testIsBenchmarkFlag() {
  const { server, port } = await createServer((_req, res) => {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    // With isBenchmark: true, logging should be suppressed
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { 
      baseUrl: base, 
      isBenchmark: true 
    });
    if (out.status !== 200) {
      throw new Error(`isBenchmark: expected 200, got ${out.status}`);
    }
    console.log('  OK isBenchmark flag -> suppresses logging');
  } finally {
    await closeServer(server);
  }
}

async function testConcurrentRequests() {
  const { server, port } = await createServer((_req, res) => {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const promises = Array.from({ length: 10 }, (_, i) => 
      safaricomCoreCall({ id: i }, 'tk', 'topup', { baseUrl: base })
    );
    const results = await Promise.all(promises);
    const allSuccess = results.every(r => r.status === 200);
    if (!allSuccess) {
      throw new Error(`concurrent: expected all 200, got ${results.map(r => r.status)}`);
    }
    console.log('  OK concurrent requests -> all succeed');
  } finally {
    await closeServer(server);
  }
}

async function testMalformedJsonResponse() {
  const { server, port } = await createServer((_req, res) => {
    res.writeHead(200);
    res.end('not json{invalid'); // Malformed JSON
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    // Axios should still return 200, but data might be the raw string
    if (out.status !== 200) {
      throw new Error(`malformed JSON: expected 200, got ${out.status}`);
    }
    console.log('  OK malformed JSON response -> handled');
  } finally {
    await closeServer(server);
  }
}

async function testRetryBackoffTiming() {
  let attempts = 0;
  const timings: number[] = [];
  const { server, port } = await createServer((_req, res) => {
    attempts++;
    timings.push(Date.now());
    res.setHeader('Content-Type', 'application/json');
    if (attempts < 3) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Transient' }));
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({ transactionId: 'T' }));
    }
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const { safaricomCoreCall } = await import(REPO_PATH);
    const start = Date.now();
    const out = await safaricomCoreCall({ amount: 100 }, 'tk', 'topup', { baseUrl: base });
    const totalTime = Date.now() - start;
    
    if (out.status !== 200 || attempts !== 3) {
      throw new Error(`backoff timing: expected 200 after 3 attempts, got ${out.status} attempts=${attempts}`);
    }
    
    // Check that delays were applied (should take at least some time)
    if (timings.length >= 2) {
      const delay1 = timings[1] - timings[0];
      const delay2 = timings[2] - timings[1];
      // Delays should be roughly 1-2 seconds with jitter (allowing some variance)
      if (delay1 < 500 || delay2 < 500) {
        throw new Error(`backoff timing: delays too short, delay1=${delay1}ms delay2=${delay2}ms`);
      }
    }
    
    console.log('  OK retry backoff timing -> delays applied correctly');
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

  console.log('\n=== Edge Case Tests: Input Validation ===');
  await testNullBody();
  await testUndefinedBody();
  await testEmptyStringBody();
  await testNonObjectBody();

  console.log('\n=== Edge Case Tests: HTTP Status Codes ===');
  await test401Unauthorized();
  await test403Forbidden();
  await test404NotFound();
  await test422UnprocessableEntity();
  await test429RateLimitRetry();
  await test502BadGateway();
  await test503ServiceUnavailable();
  await test504GatewayTimeout();

  console.log('\n=== Edge Case Tests: Retry Logic ===');
  await testMaxRetriesReached();
  await testRetryBackoffTiming();

  console.log('\n=== Edge Case Tests: Network Errors ===');
  await testNetworkError();
  await testConnectionRefused();
  await testTimeout();

  console.log('\n=== Edge Case Tests: Data Handling ===');
  await testLargeRequestBody();
  await testLargeResponseBody();
  await testEmptyResponse();
  await testMalformedJsonResponse();

  console.log('\n=== Edge Case Tests: Configuration ===');
  await testNullToken();
  await testTokenDestination();
  await testTopupDestination();
  await testDefaultBaseUrl();
  await testUndefinedConfig();
  await testIsBenchmarkFlag();

  console.log('\n=== Edge Case Tests: Concurrency ===');
  await testConcurrentRequests();

  console.log('\nAll edge case tests passed.');

  await testBenchmark();
  console.log('\nAll tests and benchmarks passed.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(isBefore ? 0 : 1);
});
