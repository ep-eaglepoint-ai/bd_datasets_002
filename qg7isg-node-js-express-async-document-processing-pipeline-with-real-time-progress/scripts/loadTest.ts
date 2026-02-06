import { WebSocket } from 'ws';
import prisma from '../repository_after/src/config/database';
import { randomUUID } from 'crypto';

/**
 * Simulates 100 concurrent WebSocket connections to a job and measures performance.
 * Run this against a running server.
 */
async function runLoadTest(serverUrl: string, partnerId: string, jobId: string) {
  const CONCURRENT_CONNECTIONS = 100;
  const connections: WebSocket[] = [];
  let connectedCount = 0;
  let messageCount = 0;

  console.log(`Starting load test with ${CONCURRENT_CONNECTIONS} connections...`);
  const startTime = Date.now();

  const connect = (id: number) => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`${serverUrl}/ws/jobs/${jobId}?partnerId=${partnerId}`);
      
      ws.on('open', () => {
        connectedCount++;
        resolve();
      });

      ws.on('message', () => {
        messageCount++;
      });

      ws.on('error', (err) => {
        console.error(`WS ${id} error:`, err.message);
        reject(err);
      });

      connections.push(ws);
    });
  };

  try {
    const promises = [];
    for (let i = 0; i < CONCURRENT_CONNECTIONS; i++) {
      promises.push(connect(i));
    }

    await Promise.all(promises);
    const connectionTime = Date.now() - startTime;
    console.log(`All connections established in ${connectionTime}ms`);
    console.log(`Connected: ${connectedCount}`);

    // Wait a bit to observe message broadcasting if the job is running
    await new Promise(r => setTimeout(r, 2000));
    console.log(`Total messages received: ${messageCount}`);

  } catch (error) {
    console.error('Load test failed:', error);
  } finally {
    connections.forEach(ws => ws.terminate());
    console.log('Load test finished.');
  }
}

// Entry point (manual run)
if (require.main === module) {
  const url = process.argv[2] || 'ws://localhost:3000';
  const pId = process.argv[3];
  const jId = process.argv[4];
  
  if (!pId || !jId) {
    console.error('Usage: ts-node loadTest.ts <url> <partnerId> <jobId>');
    process.exit(1);
  }
  
  runLoadTest(url, pId, jId);
}

export { runLoadTest };
