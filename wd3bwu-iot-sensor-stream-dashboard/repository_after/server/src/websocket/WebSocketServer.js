const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { SubscriptionManager } = require('./SubscriptionManager');

/**
 * WebSocketServer - Handles WebSocket connections and message routing
 * 
 * Protocol Messages:
 * - Client -> Server:
 *   { type: 'subscribe', sensorIds: [...] }
 *   { type: 'unsubscribe', sensorIds: [...] }
 *   { type: 'setSubscriptions', sensorIds: [...] }
 *   { type: 'ping' }
 * 
 * - Server -> Client:
 *   { type: 'connected', clientId: '...' }
 *   { type: 'subscribed', sensorIds: [...] }
 *   { type: 'unsubscribed', sensorIds: [...] }
 *   { type: 'sensorData', sensorId: '...', data: {...} }
 *   { type: 'sensorDataBatch', sensors: [{ sensorId, data }] }
 *   { type: 'pong' }
 *   { type: 'error', message: '...' }
 */

class WebSocketServerWrapper {
  /**
   * @param {object} options
   * @param {http.Server} options.server - HTTP server to attach to
   * @param {string} options.path - WebSocket path (default '/ws')
   * @param {number} options.heartbeatInterval - Heartbeat interval in ms (default 30000)
   */
  constructor(options = {}) {
    this.path = options.path || '/ws';
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.subscriptionManager = new SubscriptionManager();
    this.wss = null;
    this.heartbeatTimer = null;
  }

  /**
   * Attach to an HTTP server and start accepting connections
   * @param {http.Server} server 
   */
  attach(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: this.path
    });

    this.wss.on('connection', (ws, req) => {
      this._handleConnection(ws, req);
    });

    // Start heartbeat
    this._startHeartbeat();

    console.log(`WebSocket server attached at path: ${this.path}`);
  }

  /**
   * Handle a new WebSocket connection
   * @private
   */
  _handleConnection(ws, req) {
    const clientId = uuidv4();
    ws.clientId = clientId;
    ws.isAlive = true;

    // Register client
    this.subscriptionManager.registerClient(clientId, ws);

    // Send connection confirmation
    this._send(ws, {
      type: 'connected',
      clientId
    });

    console.log(`Client connected: ${clientId}`);

    // Handle messages
    ws.on('message', (data) => {
      this._handleMessage(ws, clientId, data);
    });

    // Handle pong (heartbeat response)
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle close
    ws.on('close', () => {
      this.subscriptionManager.unregisterClient(clientId);
      console.log(`Client disconnected: ${clientId}`);
    });

    // Handle errors
    ws.on('error', (err) => {
      console.error(`WebSocket error for client ${clientId}:`, err.message);
    });
  }

  /**
   * Handle incoming message from client
   * @private
   */
  _handleMessage(ws, clientId, data) {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'subscribe':
          if (Array.isArray(message.sensorIds)) {
            this.subscriptionManager.subscribe(clientId, message.sensorIds);
            this._send(ws, {
              type: 'subscribed',
              sensorIds: message.sensorIds
            });
          }
          break;
          
        case 'unsubscribe':
          if (Array.isArray(message.sensorIds)) {
            this.subscriptionManager.unsubscribe(clientId, message.sensorIds);
            this._send(ws, {
              type: 'unsubscribed',
              sensorIds: message.sensorIds
            });
          }
          break;
          
        case 'setSubscriptions':
          if (Array.isArray(message.sensorIds)) {
            this.subscriptionManager.setSubscriptions(clientId, message.sensorIds);
            this._send(ws, {
              type: 'subscribed',
              sensorIds: message.sensorIds
            });
          }
          break;
          
        case 'ping':
          this._send(ws, { type: 'pong' });
          break;
          
        default:
          this._send(ws, {
            type: 'error',
            message: `Unknown message type: ${message.type}`
          });
      }
    } catch (err) {
      this._send(ws, {
        type: 'error',
        message: 'Invalid JSON message'
      });
    }
  }

  /**
   * Send a message to a WebSocket client
   * @private
   */
  _send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Start heartbeat timer to detect dead connections
   * @private
   */
  _startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (!this.wss) return;
      
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          // Connection is dead
          if (ws.clientId) {
            this.subscriptionManager.unregisterClient(ws.clientId);
          }
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, this.heartbeatInterval);
  }

  /**
   * Broadcast sensor data to subscribed clients
   * @param {string} sensorId 
   * @param {object} data 
   */
  broadcast(sensorId, data) {
    return this.subscriptionManager.broadcast(sensorId, data);
  }

  /**
   * Broadcast batch of sensor data
   * @param {Object} sensorDataMap 
   */
  broadcastBatch(sensorDataMap) {
    return this.subscriptionManager.broadcastBatch(sensorDataMap);
  }

  /**
   * Get subscription manager for external access
   * @returns {SubscriptionManager}
   */
  getSubscriptionManager() {
    return this.subscriptionManager;
  }

  /**
   * Get server statistics
   * @returns {object}
   */
  getStats() {
    return {
      connections: this.wss ? this.wss.clients.size : 0,
      ...this.subscriptionManager.getStats()
    };
  }

  /**
   * Close the WebSocket server
   */
  close() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}

module.exports = { WebSocketServer: WebSocketServerWrapper };
