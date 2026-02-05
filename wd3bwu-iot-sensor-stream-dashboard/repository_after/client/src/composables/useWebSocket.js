/**
 * WebSocket Composable - Manages WebSocket connection with auto-reconnect
 * 
 * Requirement 3: WebSocket protocol with subscription support
 */

import { ref, onMounted, onUnmounted } from 'vue';
import { debounce } from '../utils/performanceOptimizations.js';

/**
 * @param {string} url - WebSocket URL
 * @param {object} options - Configuration options
 */
export function useWebSocket(url, options = {}) {
  const {
    reconnectDelay = 1000,
    maxReconnectDelay = 30000,
    reconnectMultiplier = 1.5
  } = options;

  const ws = ref(null);
  const isConnected = ref(false);
  const clientId = ref(null);
  const error = ref(null);
  
  let messageHandlers = [];
  let currentReconnectDelay = reconnectDelay;
  let reconnectTimeout = null;
  let intentionalClose = false;

  const connect = () => {
    try {
      const socket = new WebSocket(url);
      
      socket.onopen = () => {
        console.log('WebSocket connected');
        isConnected.value = true;
        error.value = null;
        currentReconnectDelay = reconnectDelay;
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle connection confirmation
          if (message.type === 'connected') {
            clientId.value = message.clientId;
          }
          
          // Dispatch to all handlers
          messageHandlers.forEach(handler => handler(message));
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        isConnected.value = false;
        ws.value = null;
        
        if (!intentionalClose) {
          scheduleReconnect();
        }
      };

      socket.onerror = (e) => {
        console.error('WebSocket error:', e);
        error.value = 'Connection error';
      };

      ws.value = socket;
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      error.value = e.message;
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    
    console.log(`Reconnecting in ${currentReconnectDelay}ms...`);
    reconnectTimeout = setTimeout(() => {
      connect();
      currentReconnectDelay = Math.min(
        currentReconnectDelay * reconnectMultiplier,
        maxReconnectDelay
      );
    }, currentReconnectDelay);
  };

  const disconnect = () => {
    intentionalClose = true;
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
  };

  const send = (message) => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  const subscribe = (sensorIds) => {
    return send({
      type: 'subscribe',
      sensorIds
    });
  };

  const unsubscribe = (sensorIds) => {
    return send({
      type: 'unsubscribe',
      sensorIds
    });
  };

  const setSubscriptions = (sensorIds) => {
    return send({
      type: 'setSubscriptions',
      sensorIds
    });
  };

  // Debounced subscription update for viewport changes
  const debouncedSetSubscriptions = debounce((sensorIds) => {
    setSubscriptions(sensorIds);
  }, 100);

  const onMessage = (handler) => {
    messageHandlers.push(handler);
    return () => {
      messageHandlers = messageHandlers.filter(h => h !== handler);
    };
  };

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    clientId,
    error,
    send,
    subscribe,
    unsubscribe,
    setSubscriptions,
    debouncedSetSubscriptions,
    onMessage,
    disconnect,
    reconnect: connect
  };
}
