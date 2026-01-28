/**
 * Sensor Store (Pinia)
 * 
 * Central state management for sensor data with performance optimizations.
 * Uses RAF-throttled updates to prevent Vue reactivity overload.
 */

import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';
import { AlertTracker } from '../utils/alertLogic.js';
import { RingBuffer, createBatchUpdater } from '../utils/performanceOptimizations.js';

export const useSensorStore = defineStore('sensors', () => {
  // Sensor list and metadata
  const sensors = ref([]);
  const sensorMap = ref(new Map());
  
  // Data buffers for sparklines (non-reactive for performance)
  const sensorDataBuffers = new Map();
  
  // Latest values - using reactive object for proper reactivity
  const latestValues = reactive({});
  
  // Alert states - reactive object to track active alerts
  const alertStates = reactive({});
  
  // Alert tracking (internal)
  const alertTracker = new AlertTracker(3);
  
  // Thresholds (from server)
  const thresholds = ref({
    vibration: 80,
    temperature: 85
  });

  // Connection status
  const isConnected = ref(false);
  const lastUpdate = ref(null);
  
  // Update counter to force sparkline re-renders
  const updateCounter = ref(0);

  // Computed
  const sensorCount = computed(() => sensors.value.length);
  const activeAlerts = computed(() => Object.keys(alertStates).filter(id => alertStates[id]));
  const alertCount = computed(() => activeAlerts.value.length);

  // Batch updater for high-frequency data
  const batchUpdater = createBatchUpdater((updates) => {
    // Process batch of updates
    for (const { sensorId, data } of updates) {
      // Update data buffer
      let buffer = sensorDataBuffers.get(sensorId);
      if (!buffer) {
        buffer = new RingBuffer(100); // Keep last 100 points for sparkline
        sensorDataBuffers.set(sensorId, buffer);
      }
      buffer.push(data);
      
      // Update latest value (reactive)
      latestValues[sensorId] = data;
      
      // Update alert state
      const sensor = sensorMap.value.get(sensorId);
      if (sensor) {
        const threshold = thresholds.value[sensor.type];
        const result = alertTracker.update(sensorId, data.value, threshold);
        // Update reactive alert state
        alertStates[sensorId] = result.isAlertActive;
      }
    }
    
    // Increment counter to force sparkline updates
    updateCounter.value++;
    lastUpdate.value = Date.now();
  }, 50); // Batch up to 50 updates

  // Actions
  function setSensors(sensorList) {
    sensors.value = sensorList;
    sensorMap.value = new Map(sensorList.map(s => [s.id, s]));
    
    // Initialize data buffers and reactive states
    for (const sensor of sensorList) {
      if (!sensorDataBuffers.has(sensor.id)) {
        sensorDataBuffers.set(sensor.id, new RingBuffer(100));
      }
      latestValues[sensor.id] = null;
      alertStates[sensor.id] = false;
    }
  }

  function updateSensorData(sensorId, data) {
    batchUpdater.add({ sensorId, data });
  }

  function updateSensorDataBatch(updates) {
    for (const { sensorId, data } of updates) {
      batchUpdater.add({ sensorId, data });
    }
  }

  function getSensorData(sensorId) {
    // Access updateCounter to create dependency
    const _ = updateCounter.value;
    const buffer = sensorDataBuffers.get(sensorId);
    return buffer ? buffer.toArray() : [];
  }

  function getLatestValue(sensorId) {
    return latestValues[sensorId];
  }

  function isAlertActive(sensorId) {
    return alertStates[sensorId] || false;
  }

  function getSensorThreshold(sensorId) {
    const sensor = sensorMap.value.get(sensorId);
    if (!sensor) return null;
    return thresholds.value[sensor.type];
  }

  function setConnectionStatus(connected) {
    isConnected.value = connected;
  }

  function setThresholds(newThresholds) {
    thresholds.value = { ...thresholds.value, ...newThresholds };
  }

  function clearAllData() {
    sensorDataBuffers.clear();
    Object.keys(latestValues).forEach(key => delete latestValues[key]);
    Object.keys(alertStates).forEach(key => delete alertStates[key]);
    alertTracker.clearAll();
    batchUpdater.cancel();
  }

  return {
    // State
    sensors,
    sensorMap,
    latestValues,
    thresholds,
    isConnected,
    lastUpdate,
    updateCounter,
    alertStates,
    
    // Computed
    sensorCount,
    activeAlerts,
    alertCount,
    
    // Actions
    setSensors,
    updateSensorData,
    updateSensorDataBatch,
    getSensorData,
    getLatestValue,
    isAlertActive,
    getSensorThreshold,
    setConnectionStatus,
    setThresholds,
    clearAllData
  };
});
