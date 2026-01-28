const { createServer } = require('http');
const Client = require('socket.io-client');
const path = require('path');

// Allow running against before/after based on ENV
const repoFolder = process.env.REPO_PATH || 'repository_after';
const ChatService = require(`../${repoFolder}/ChatService`);

// Mock Redis
jest.mock('ioredis', () => require('ioredis-mock'));

describe(`ChatService (${repoFolder})`, () => {
  let serverA, serverB;
  let serviceA, serviceB;
  let clientA, clientB;
  let portA, portB;

  const startServer = () =>
    new Promise((resolve) => {
      const httpServer = createServer();
      httpServer.listen(() => {
        const port = httpServer.address().port;
        const service = new ChatService(httpServer);
        resolve({ httpServer, service, port });
      });
    });

  beforeEach(async () => {
    // Req 7.1: Simulate two distinct instances
    const nodeA = await startServer();
    const nodeB = await startServer();

    serverA = nodeA.httpServer;
    serverB = nodeB.httpServer;
    serviceA = nodeA.service;
    serviceB = nodeB.service;
    portA = nodeA.port;
    portB = nodeB.port;
  });

  afterEach(async () => {
    if (clientA) clientA.close();
    if (clientB) clientB.close();
    await serviceA.close();
    await serviceB.close();
    serverA.close();
    serverB.close();
  });

  test('Req 7.2: Message published on Node A is broadcast to Node B', (done) => {
    clientA = Client(`http://localhost:${portA}`);
    clientB = Client(`http://localhost:${portB}`);
    const room = 'global-room';

    // Client B joins first to ensure subscription is active
    clientB.on('connect', () => {
      clientB.emit('join_room', room);
    });

    clientB.on('broadcast_message', (data) => {
      try {
        expect(data.message).toBe('Hello from A');
        expect(data.sender).toBe('User A');
        // Ensure serialization worked
        expect(data.instanceId).toBeDefined();
        done();
      } catch (err) {
        done(err);
      }
    });

    clientA.on('connect', () => {
      clientA.emit('join_room', room);
      // Wait a bit for Redis subscriptions to propagate
      setTimeout(() => {
        clientA.emit('send_message', {
          room,
          message: 'Hello from A',
          sender: 'User A'
        });
      }, 100);
    });
  });

  test('Req 7.3: Room Activity is tracked via TTL', async () => {
    clientA = Client(`http://localhost:${portA}`);
    const room = 'ttl-test-room';

    // Spy on Redis SET command to verify TTL is used
    const spySet = jest.spyOn(serviceA.pub, 'set');

    clientA.on('connect', () => {
      clientA.emit('join_room', room);
    });

    // Wait for async join
    await new Promise((r) => setTimeout(r, 100));

    // Verify we set the key with Expiration
    expect(spySet).toHaveBeenCalledWith(
      `room:${room}:active`, 
      '1', 
      'EX', 
      300
    );

    // Verify logic helper
    const isActive = await serviceA.isRoomActive(room);
    expect(isActive).toBe(true);
  });
});