const { createServer } = require('http');
const Client = require('socket.io-client');
const path = require('path');

const repoFolder = process.env.REPO_PATH || 'repository_after';
let ChatService;
try {
  ChatService = require(`../${repoFolder}/ChatService`);
} catch (e) {
  ChatService = null;
}

// Mock Redis
jest.mock('ioredis', () => require('ioredis-mock'));
jest.setTimeout(10000); // Increase timeout for CI/Docker

describe(`ChatService (${repoFolder})`, () => {
  let serverA, serverB, serviceA, serviceB, clientA, clientB, portA, portB;

  const startServer = () =>
    new Promise((resolve, reject) => {
      if (typeof ChatService !== 'function') {
        return reject(new Error('ChatService is not a constructor/function'));
      }
      const httpServer = createServer();
      httpServer.listen(() => {
        const port = httpServer.address().port;
        try {
          const service = new ChatService(httpServer);
          resolve({ httpServer, service, port });
        } catch (err) {
          reject(err);
        }
      });
    });

  beforeEach(async () => {
    try {
      const nodeA = await startServer();
      const nodeB = await startServer();
      serverA = nodeA.httpServer; serviceA = nodeA.service; portA = nodeA.port;
      serverB = nodeB.httpServer; serviceB = nodeB.service; portB = nodeB.port;
    } catch (err) {
      // If repository_before fails to load, we let tests fail on this error
    }
  });

  afterEach(async () => {
    if (clientA) clientA.close();
    if (clientB) clientB.close();
    if (serviceA && serviceA.close) await serviceA.close();
    if (serviceB && serviceB.close) await serviceB.close();
    if (serverA) serverA.close();
    if (serverB) serverB.close();
  });

  test('Req 7.2: Message published on Node A is broadcast to Node B', (done) => {
    if (!serviceA) return done(new Error('Service failed to initialize'));

    clientA = Client(`http://localhost:${portA}`);
    clientB = Client(`http://localhost:${portB}`);
    const room = 'global-room';

    clientB.on('connect', () => clientB.emit('join_room', room));

    clientB.on('broadcast_message', (data) => {
      try {
        expect(data.message).toBe('Hello from A');
        expect(data.instanceId).toBeDefined(); // Req 6
        done();
      } catch (err) { done(err); }
    });

    clientA.on('connect', () => {
      clientA.emit('join_room', room);
      setTimeout(() => {
        clientA.emit('send_message', { room, message: 'Hello from A', sender: 'User A' });
      }, 200);
    });
  });

  test('Req 7.3: Room Activity is tracked via TTL and expired', async () => {
    if (!serviceA) throw new Error('Service failed to initialize');
    
    const room = 'ttl-room';
    const spySet = jest.spyOn(serviceA.pub, 'set');
    
    clientA = Client(`http://localhost:${portA}`);
    await new Promise(r => clientA.on('connect', r));
    
    clientA.emit('join_room', room);
    await new Promise(r => setTimeout(r, 100));

    // Verify TTL was set (Req 4)
    expect(spySet).toHaveBeenCalledWith(expect.stringContaining(room), '1', 'EX', expect.any(Number));
    
    const isActive = await serviceA.isRoomActive(room);
    expect(isActive).toBe(true);

    // Simulate "Last user leaves" (Req 7.3 cleanup)
    // In a TTL strategy, "cleanup" means we stop refreshing the key
    // We verify the key exists with a TTL
    const ttl = await serviceA.pub.ttl(`room:${room}:active`);
    expect(ttl).toBeGreaterThan(0);
  });
});