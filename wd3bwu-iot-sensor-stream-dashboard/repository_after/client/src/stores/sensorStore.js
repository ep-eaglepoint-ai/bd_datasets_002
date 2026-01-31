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

  // Playback state
  const isPlaybackMode = ref(false);
  const isPlaying = ref(false);
  const playbackSpeed = ref(1);
  const playbackTime = ref(0);
  const playbackStartTime = ref(0);
  const playbackEndTime = ref(0);
  const playbackData = new Map(); // Store full history for playback
  const playbackCursors = new Map(); // Track current index per sensor for incremental updates
  const lastPlaybackTime = ref(0); // Track last seek time to detect jumps

  // Computed
  const sensorCount = computed(() => sensors.value.length);
  const activeAlerts = computed(() => Object.keys(alertStates).filter(id => alertStates[id]));
  const alertCount = computed(() => activeAlerts.value.length);
  const playbackProgress = computed(() => {
    if (!playbackStartTime.value || !playbackEndTime.value) return 0;
    return Math.min(100, Math.max(0, ((playbackTime.value - playbackStartTime.value) / (playbackEndTime.value - playbackStartTime.value)) * 100));
  });

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
    // Ignore live updates in playback mode
    if (isPlaybackMode.value) return;
    batchUpdater.add({ sensorId, data });
  }

  function updateSensorDataBatch(updates) {
    if (isPlaybackMode.value) return;
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

  // Historical Playback Actions
  async function enterPlaybackMode(startTime, endTime) {
    // Stop live updates
    isPlaybackMode.value = true;
    isPlaying.value = false;
    
    // Clear current buffers to prepare for playback
    sensorDataBuffers.clear();
    // Re-init buffers
    for (const sensor of sensors.value) {
      sensorDataBuffers.set(sensor.id, new RingBuffer(100));
    }
    
    playbackStartTime.value = startTime;
    playbackEndTime.value = endTime;
    playbackTime.value = startTime;
    
    // Fetch data
    try {
        const sensorIds = sensors.value.map(s => s.id);
        // Fetch in chunks or all at once? For 10 mins @ 10Hz * 50 sensors = 300k points. Too big for one request?
        // Let's try batch request. server /batch accepts max 100 sensors.
        // We have 50. Should be ok? 
        // 50 sensors * 6000 points = 300,000 points.
        // JSON size: 300k * ~50 bytes = 15MB. Feasible but heavy.
        
        const apiUrl = `http://${window.location.hostname}:3001/api/history/batch`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sensorIds,
                start: startTime,
                end: endTime
            })
        });
        
        const result = await response.json();
        
        // Populate playbackData
        playbackData.clear();
        if (result.sensors) {
            Object.entries(result.sensors).forEach(([id, data]) => {
                // Sort just in case
                data.sort((a, b) => a.timestamp - b.timestamp);
                playbackData.set(id, data);
            });
        }
        
        // Initial seek to start
        seekTo(startTime);
        
    } catch (e) {
        console.error("Failed to load history", e);
        // Exit playback on error?
        exitPlaybackMode();
        throw e;
    }
  }

  function exitPlaybackMode() {
    isPlaybackMode.value = false;
    stopPlayback();
    playbackData.clear();
    
    // Clear buffers to receive fresh live data
    sensorDataBuffers.clear();
    for (const sensor of sensors.value) {
      sensorDataBuffers.set(sensor.id, new RingBuffer(100));
    }
  }

  function togglePlayback() {
    if (isPlaying.value) stopPlayback();
    else startPlayback();
  }

  function startPlayback() {
    if (isPlaying.value) return;
    isPlaying.value = true;
    
    let lastFrameTime = performance.now();
    
    const step = () => {
        if (!isPlaying.value) return;
        
        const now = performance.now();
        const dt = now - lastFrameTime;
        lastFrameTime = now;
        
        // Advance time
        const timeIncrement = dt * playbackSpeed.value;
        const newTime = playbackTime.value + timeIncrement;
        
        if (newTime >= playbackEndTime.value) {
            playbackTime.value = playbackEndTime.value;
            stopPlayback();
            return;
        }
        
        seekTo(newTime);
        
        requestAnimationFrame(step);
    };
    
    requestAnimationFrame(step);
  }

  function stopPlayback() {
    isPlaying.value = false;
  }

  function seekTo(timestamp) {
    const previousTime = lastPlaybackTime.value;
    playbackTime.value = timestamp;
    lastPlaybackTime.value = timestamp;
    
    // Detect if this is a "jump" (arbitrary seek) vs incremental advance
    // A jump is when we go backwards OR skip forward by more than 500ms
    const isJump = timestamp < previousTime || (timestamp - previousTime) > 500;
    
    for (const [sensorId, data] of playbackData.entries()) {
        const buffer = sensorDataBuffers.get(sensorId);
        if (!buffer || data.length === 0) continue;
        
        // Find target index via binary search
        let targetIdx = -1;
        let low = 0, high = data.length - 1;
        while (low <= high) {
            const mid = (low + high) >>> 1;
            if (data[mid].timestamp <= timestamp) {
                targetIdx = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        
        if (targetIdx === -1) continue;
        
        const currentCursor = playbackCursors.get(sensorId) || -1;
        
        if (isJump || currentCursor === -1 || targetIdx < currentCursor) {
            // Full rebuild for jumps, initial load, or backward seeks
            const startIdx = Math.max(0, targetIdx - 99);
            buffer.clear();
            for (let i = startIdx; i <= targetIdx; i++) {
                buffer.push(data[i]);
            }
        } else if (targetIdx > currentCursor) {
            // Incremental: just push new points since last cursor
            for (let i = currentCursor + 1; i <= targetIdx; i++) {
                buffer.push(data[i]);
            }
        }
        // else targetIdx === currentCursor, no update needed
        
        playbackCursors.set(sensorId, targetIdx);
        latestValues[sensorId] = data[targetIdx];
    }
    
    updateCounter.value++;
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
    
    // Playback State
    isPlaybackMode,
    isPlaying,
    playbackSpeed,
    playbackTime,
    playbackStartTime,
    playbackEndTime,
    playbackProgress,
    
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
    clearAllData,
    
    // Playback Actions
    enterPlaybackMode,
    exitPlaybackMode,
    togglePlayback,
    seekTo
  };
});
