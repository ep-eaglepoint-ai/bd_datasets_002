import { WebSocket } from 'ws';
import app, { closeForTest } from '../repository_after/src/app';
import prisma from '../repository_after/src/config/database';
import redis from '../repository_after/src/config/redis';
import { randomUUID } from 'crypto';
import { createServer } from 'http';
import { AddressInfo } from 'net';

describe('WebSocket Progress Broadcasting', () => {
  let partnerId: string;
  let schemaId: string;
  let server: any;
  let baseUrl: string;
  const apiKey = 'ws-test-key-' + Date.now();

  beforeAll(async () => {
    // Create test partner & schema
    const partner = await prisma.partner.create({
      data: { id: randomUUID(), name: 'WS Partner', apiKey },
    });
    partnerId = partner.id;

    const schema = await prisma.schema.create({
      data: {
        id: randomUUID(),
        partnerId,
        name: 'WS Schema',
        version: '1.0',
        fields: [],
        validationRules: {},
      },
    });
    schemaId = schema.id;

    // Start a temporary server for WS tests
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `ws://localhost:${port}`;
  });

  afterAll(async () => {
    await prisma.job.deleteMany({ where: { partnerId } });
    await prisma.schema.deleteMany({ where: { partnerId } });
    await prisma.partner.delete({ where: { id: partnerId } });
    await prisma.$disconnect();
    await redis.quit();
    server.close();
    closeForTest();
  });

  it('should receive progress updates via WebSocket', (done) => {
    prisma.job.create({
      data: {
        id: randomUUID(),
        partnerId,
        schemaId,
        filename: 'ws-test.csv',
        fileSize: BigInt(100),
        fileType: 'csv',
        status: 'PENDING',
      },
    }).then((job) => {
      const ws = new WebSocket(`${baseUrl}/ws/jobs/${job.id}?partnerId=${partnerId}`);

      ws.on('open', () => {
        // Mock a progress update from Redis
        const { CHANNEL } = require('../repository_after/src/config/jobEvents');
        redis.publish(CHANNEL, JSON.stringify({
          jobId: job.id,
          message: { type: 'progress', progress: 50, records_processed: 5 }
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'progress') {
          expect(message.progress).toBe(50);
          ws.close();
          done();
        }
      });

      ws.on('error', (err) => done(err));
    });
  });

  it('should reject connection for invalid job or partner', (done) => {
    const ws = new WebSocket(`${baseUrl}/ws/jobs/non-existent?partnerId=wrong`);
    ws.on('close', (code) => {
      expect(code).toBe(1008);
      done();
    });
  });
});
