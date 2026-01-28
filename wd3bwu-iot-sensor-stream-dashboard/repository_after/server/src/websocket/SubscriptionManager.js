/**
 * SubscriptionManager - Manages WebSocket client subscriptions to sensors
 * 
 * Requirement 3: Implement a WebSocket protocol that supports 'subscriptions': 
 * a client should only receive data for the sensors currently visible in the viewport.
 */

class SubscriptionManager {
  constructor() {
    // Map of clientId -> Set of sensorIds
    this.clientSubscriptions = new Map();
    // Reverse map: sensorId -> Set of clientIds (for efficient broadcast)
    this.sensorSubscribers = new Map();
    // Map of clientId -> WebSocket
    this.clients = new Map();
  }

  /**
   * Register a new client connection
   * @param {string} clientId 
   * @param {WebSocket} ws 
   */
  registerClient(clientId, ws) {
    this.clients.set(clientId, ws);
    this.clientSubscriptions.set(clientId, new Set());
  }

  /**
   * Unregister a client and clean up all subscriptions
   * @param {string} clientId 
   */
  unregisterClient(clientId) {
    const subscriptions = this.clientSubscriptions.get(clientId);
    if (subscriptions) {
      // Remove from all sensor subscriber lists
      for (const sensorId of subscriptions) {
        const subscribers = this.sensorSubscribers.get(sensorId);
        if (subscribers) {
          subscribers.delete(clientId);
          if (subscribers.size === 0) {
            this.sensorSubscribers.delete(sensorId);
          }
        }
      }
    }
    
    this.clientSubscriptions.delete(clientId);
    this.clients.delete(clientId);
  }

  /**
   * Subscribe a client to specific sensors
   * @param {string} clientId 
   * @param {Array<string>} sensorIds 
   */
  subscribe(clientId, sensorIds) {
    const subscriptions = this.clientSubscriptions.get(clientId);
    if (!subscriptions) {
      return false;
    }

    for (const sensorId of sensorIds) {
      subscriptions.add(sensorId);
      
      if (!this.sensorSubscribers.has(sensorId)) {
        this.sensorSubscribers.set(sensorId, new Set());
      }
      this.sensorSubscribers.get(sensorId).add(clientId);
    }
    
    return true;
  }

  /**
   * Unsubscribe a client from specific sensors
   * @param {string} clientId 
   * @param {Array<string>} sensorIds 
   */
  unsubscribe(clientId, sensorIds) {
    const subscriptions = this.clientSubscriptions.get(clientId);
    if (!subscriptions) {
      return false;
    }

    for (const sensorId of sensorIds) {
      subscriptions.delete(sensorId);
      
      const subscribers = this.sensorSubscribers.get(sensorId);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.sensorSubscribers.delete(sensorId);
        }
      }
    }
    
    return true;
  }

  /**
   * Replace all subscriptions for a client (used when viewport changes)
   * @param {string} clientId 
   * @param {Array<string>} sensorIds 
   */
  setSubscriptions(clientId, sensorIds) {
    const currentSubs = this.clientSubscriptions.get(clientId);
    if (!currentSubs) {
      return false;
    }

    const newSensorSet = new Set(sensorIds);
    
    // Find sensors to unsubscribe (in current but not in new)
    const toUnsubscribe = [];
    for (const sensorId of currentSubs) {
      if (!newSensorSet.has(sensorId)) {
        toUnsubscribe.push(sensorId);
      }
    }
    
    // Find sensors to subscribe (in new but not in current)
    const toSubscribe = [];
    for (const sensorId of sensorIds) {
      if (!currentSubs.has(sensorId)) {
        toSubscribe.push(sensorId);
      }
    }
    
    this.unsubscribe(clientId, toUnsubscribe);
    this.subscribe(clientId, toSubscribe);
    
    return true;
  }

  /**
   * Get all clients subscribed to a specific sensor
   * @param {string} sensorId 
   * @returns {Array<string>}
   */
  getSubscribers(sensorId) {
    const subscribers = this.sensorSubscribers.get(sensorId);
    return subscribers ? Array.from(subscribers) : [];
  }

  /**
   * Get all sensors a client is subscribed to
   * @param {string} clientId 
   * @returns {Array<string>}
   */
  getSubscriptions(clientId) {
    const subscriptions = this.clientSubscriptions.get(clientId);
    return subscriptions ? Array.from(subscriptions) : [];
  }

  /**
   * Broadcast data to all clients subscribed to a sensor
   * @param {string} sensorId 
   * @param {object} data 
   */
  broadcast(sensorId, data) {
    const subscribers = this.sensorSubscribers.get(sensorId);
    if (!subscribers || subscribers.size === 0) {
      return 0;
    }

    const message = JSON.stringify({
      type: 'sensorData',
      sensorId,
      data
    });

    let sentCount = 0;
    for (const clientId of subscribers) {
      const ws = this.clients.get(clientId);
      if (ws && ws.readyState === 1) { // WebSocket.OPEN = 1
        try {
          ws.send(message);
          sentCount++;
        } catch (err) {
          // Client disconnected, will be cleaned up
          console.error(`Failed to send to client ${clientId}:`, err.message);
        }
      }
    }
    
    return sentCount;
  }

  /**
   * Broadcast data to multiple sensors efficiently (batched)
   * @param {Object} sensorDataMap - { sensorId: data }
   */
  broadcastBatch(sensorDataMap) {
    // Group data by client to minimize sends
    const clientMessages = new Map();
    
    for (const [sensorId, data] of Object.entries(sensorDataMap)) {
      const subscribers = this.sensorSubscribers.get(sensorId);
      if (!subscribers) continue;
      
      for (const clientId of subscribers) {
        if (!clientMessages.has(clientId)) {
          clientMessages.set(clientId, []);
        }
        clientMessages.get(clientId).push({ sensorId, data });
      }
    }
    
    // Send batched messages to each client
    let totalSent = 0;
    for (const [clientId, messages] of clientMessages) {
      const ws = this.clients.get(clientId);
      if (ws && ws.readyState === 1) {
        try {
          ws.send(JSON.stringify({
            type: 'sensorDataBatch',
            sensors: messages
          }));
          totalSent++;
        } catch (err) {
          console.error(`Failed to send batch to client ${clientId}:`, err.message);
        }
      }
    }
    
    return totalSent;
  }

  /**
   * Get statistics about subscriptions
   * @returns {object}
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      totalSubscriptions: Array.from(this.clientSubscriptions.values())
        .reduce((sum, set) => sum + set.size, 0),
      sensorsWithSubscribers: this.sensorSubscribers.size
    };
  }
}

module.exports = { SubscriptionManager };
