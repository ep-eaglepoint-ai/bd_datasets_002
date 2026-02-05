/**
 * Subscription Manager Tests
 * 
 * Requirement 3: Implement a WebSocket protocol that supports 'subscriptions': 
 * a client should only receive data for the sensors currently visible in the viewport.
 */

const { SubscriptionManager } = require('../../repository_after/server/src/websocket/SubscriptionManager');

describe('SubscriptionManager', () => {
  let manager;
  let mockWebSocket;

  beforeEach(() => {
    manager = new SubscriptionManager();
    mockWebSocket = {
      readyState: 1, // WebSocket.OPEN
      send: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Client Registration', () => {
    test('should register a new client', () => {
      manager.registerClient('client-1', mockWebSocket);
      
      expect(manager.getSubscriptions('client-1')).toEqual([]);
      expect(manager.getStats().totalClients).toBe(1);
    });

    test('should unregister a client and clean up subscriptions', () => {
      manager.registerClient('client-1', mockWebSocket);
      manager.subscribe('client-1', ['sensor-001', 'sensor-002']);
      
      manager.unregisterClient('client-1');
      
      expect(manager.getSubscriptions('client-1')).toEqual([]);
      expect(manager.getSubscribers('sensor-001')).toEqual([]);
      expect(manager.getStats().totalClients).toBe(0);
    });
  });

  describe('Subscription Management', () => {
    test('should subscribe client to sensors', () => {
      manager.registerClient('client-1', mockWebSocket);
      manager.subscribe('client-1', ['sensor-001', 'sensor-002']);
      
      expect(manager.getSubscriptions('client-1')).toContain('sensor-001');
      expect(manager.getSubscriptions('client-1')).toContain('sensor-002');
      expect(manager.getSubscribers('sensor-001')).toContain('client-1');
    });

    test('should unsubscribe client from sensors', () => {
      manager.registerClient('client-1', mockWebSocket);
      manager.subscribe('client-1', ['sensor-001', 'sensor-002']);
      manager.unsubscribe('client-1', ['sensor-001']);
      
      expect(manager.getSubscriptions('client-1')).toEqual(['sensor-002']);
      expect(manager.getSubscribers('sensor-001')).toEqual([]);
    });

    test('should replace all subscriptions with setSubscriptions', () => {
      manager.registerClient('client-1', mockWebSocket);
      manager.subscribe('client-1', ['sensor-001', 'sensor-002']);
      manager.setSubscriptions('client-1', ['sensor-003', 'sensor-004']);
      
      const subs = manager.getSubscriptions('client-1');
      expect(subs).toContain('sensor-003');
      expect(subs).toContain('sensor-004');
      expect(subs).not.toContain('sensor-001');
      expect(subs).not.toContain('sensor-002');
    });

    test('should handle multiple clients subscribing to same sensor', () => {
      const ws1 = { readyState: 1, send: jest.fn() };
      const ws2 = { readyState: 1, send: jest.fn() };
      
      manager.registerClient('client-1', ws1);
      manager.registerClient('client-2', ws2);
      
      manager.subscribe('client-1', ['sensor-001']);
      manager.subscribe('client-2', ['sensor-001']);
      
      const subscribers = manager.getSubscribers('sensor-001');
      expect(subscribers).toContain('client-1');
      expect(subscribers).toContain('client-2');
    });
  });

  describe('Broadcasting - Requirement 3', () => {
    test('should only broadcast to subscribed clients', () => {
      const ws1 = { readyState: 1, send: jest.fn() };
      const ws2 = { readyState: 1, send: jest.fn() };
      
      manager.registerClient('client-1', ws1);
      manager.registerClient('client-2', ws2);
      
      manager.subscribe('client-1', ['sensor-001']);
      manager.subscribe('client-2', ['sensor-002']);
      
      // Broadcast to sensor-001
      manager.broadcast('sensor-001', { value: 42 });
      
      // Only client-1 should receive
      expect(ws1.send).toHaveBeenCalled();
      expect(ws2.send).not.toHaveBeenCalled();
      
      const message = JSON.parse(ws1.send.mock.calls[0][0]);
      expect(message.type).toBe('sensorData');
      expect(message.sensorId).toBe('sensor-001');
      expect(message.data.value).toBe(42);
    });

    test('should not send to disconnected clients', () => {
      const ws1 = { readyState: 1, send: jest.fn() };
      const ws2 = { readyState: 3, send: jest.fn() }; // CLOSED
      
      manager.registerClient('client-1', ws1);
      manager.registerClient('client-2', ws2);
      
      manager.subscribe('client-1', ['sensor-001']);
      manager.subscribe('client-2', ['sensor-001']);
      
      manager.broadcast('sensor-001', { value: 42 });
      
      expect(ws1.send).toHaveBeenCalled();
      expect(ws2.send).not.toHaveBeenCalled();
    });

    test('should batch broadcast efficiently', () => {
      const ws1 = { readyState: 1, send: jest.fn() };
      const ws2 = { readyState: 1, send: jest.fn() };
      
      manager.registerClient('client-1', ws1);
      manager.registerClient('client-2', ws2);
      
      manager.subscribe('client-1', ['sensor-001', 'sensor-002']);
      manager.subscribe('client-2', ['sensor-002', 'sensor-003']);
      
      manager.broadcastBatch({
        'sensor-001': { value: 10 },
        'sensor-002': { value: 20 },
        'sensor-003': { value: 30 }
      });
      
      // Each client should receive one batched message
      expect(ws1.send).toHaveBeenCalledTimes(1);
      expect(ws2.send).toHaveBeenCalledTimes(1);
      
      const msg1 = JSON.parse(ws1.send.mock.calls[0][0]);
      expect(msg1.type).toBe('sensorDataBatch');
      expect(msg1.sensors).toHaveLength(2); // sensor-001 and sensor-002
      
      const msg2 = JSON.parse(ws2.send.mock.calls[0][0]);
      expect(msg2.sensors).toHaveLength(2); // sensor-002 and sensor-003
    });

    test('should return count of clients messaged', () => {
      const ws1 = { readyState: 1, send: jest.fn() };
      const ws2 = { readyState: 1, send: jest.fn() };
      
      manager.registerClient('client-1', ws1);
      manager.registerClient('client-2', ws2);
      
      manager.subscribe('client-1', ['sensor-001']);
      manager.subscribe('client-2', ['sensor-001']);
      
      const count = manager.broadcast('sensor-001', { value: 42 });
      expect(count).toBe(2);
    });
  });

  describe('Statistics', () => {
    test('should track subscription statistics', () => {
      const ws1 = { readyState: 1, send: jest.fn() };
      const ws2 = { readyState: 1, send: jest.fn() };
      
      manager.registerClient('client-1', ws1);
      manager.registerClient('client-2', ws2);
      
      manager.subscribe('client-1', ['sensor-001', 'sensor-002']);
      manager.subscribe('client-2', ['sensor-002', 'sensor-003']);
      
      const stats = manager.getStats();
      expect(stats.totalClients).toBe(2);
      expect(stats.totalSubscriptions).toBe(4);
      expect(stats.sensorsWithSubscribers).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    test('should handle subscribing unregistered client', () => {
      const result = manager.subscribe('non-existent', ['sensor-001']);
      expect(result).toBe(false);
    });

    test('should handle unsubscribing from non-subscribed sensor', () => {
      manager.registerClient('client-1', mockWebSocket);
      manager.unsubscribe('client-1', ['sensor-001']);
      
      expect(manager.getSubscriptions('client-1')).toEqual([]);
    });

    test('should handle empty subscription arrays', () => {
      manager.registerClient('client-1', mockWebSocket);
      manager.subscribe('client-1', []);
      
      expect(manager.getSubscriptions('client-1')).toEqual([]);
    });

    test('should handle broadcast to sensor with no subscribers', () => {
      const count = manager.broadcast('sensor-001', { value: 42 });
      expect(count).toBe(0);
    });
  });
});
