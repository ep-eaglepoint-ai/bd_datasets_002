<template>
  <div class="dashboard">
    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <div>Connecting to sensor network...</div>
    </div>

    <!-- Dashboard Content -->
    <template v-else>
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-content">
          <h1 class="header-title">IoT Sensor Dashboard</h1>
          
          <div class="header-stats">
            <div class="stat-item">
              <span class="stat-label">Sensors</span>
              <span class="stat-value">{{ sensorCount }}</span>
            </div>
            
            <div class="stat-item">
              <span class="stat-label">Alerts</span>
              <span class="stat-value" :class="{ critical: alertCount > 0 }">
                {{ alertCount }}
              </span>
            </div>
            
            <div class="stat-item">
              <span class="stat-label">FPS</span>
              <span class="stat-value" :class="{ warning: fps < 55 }">{{ fps }}</span>
            </div>
            
            <div class="connection-status">
              <span 
                class="status-dot" 
                :class="{ connected: isConnected, disconnected: !isConnected }"
              ></span>
              <span>{{ isConnected ? 'Live' : 'Disconnected' }}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Playback Controls -->
      <PlaybackControls />

      <!-- Sensor Grid -->
      <SensorGrid @visibility-change="handleVisibilityChange" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useSensorStore } from './stores/sensorStore.js';
import { useWebSocket } from './composables/useWebSocket.js';
import SensorGrid from './components/SensorGrid.vue';
import PlaybackControls from './components/PlaybackControls.vue';

const store = useSensorStore();
const loading = ref(true);
const fps = ref(60);

// FPS Monitor
let frameCount = 0;
let lastTime = performance.now();
const fpsInterval = setInterval(() => {
  const now = performance.now();
  fps.value = Math.round((frameCount * 1000) / (now - lastTime));
  frameCount = 0;
  lastTime = now;
}, 1000);

const countFrame = () => {
  frameCount++;
  requestAnimationFrame(countFrame);
};
requestAnimationFrame(countFrame);

onUnmounted(() => {
  clearInterval(fpsInterval);
});

// WebSocket connection
const wsUrl = `ws://${window.location.hostname}:3001/ws`;
const { 
  isConnected, 
  onMessage, 
  setSubscriptions,
  debouncedSetSubscriptions 
} = useWebSocket(wsUrl);

// Computed
const sensorCount = computed(() => store.sensorCount);
const alertCount = computed(() => store.alertCount);

// Handle sensor data from WebSocket
const handleMessage = (message) => {
  switch (message.type) {
    case 'sensorData':
      store.updateSensorData(message.sensorId, message.data);
      break;
      
    case 'sensorDataBatch':
      if (message.sensors) {
        store.updateSensorDataBatch(message.sensors);
      }
      break;
  }
};

// Handle viewport visibility changes
const handleVisibilityChange = (visibleSensorIds) => {
  // Update WebSocket subscriptions based on visible sensors
  // Only if NOT in playback mode (playback handles fetching itself)
  if (!store.isPlaybackMode) {
    debouncedSetSubscriptions(visibleSensorIds);
  }
};

// Fetch initial sensor list
const fetchSensors = async () => {
  try {
    const apiUrl = `http://${window.location.hostname}:3001/api/sensors`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    store.setSensors(data.sensors);
    
    // Subscribe to all sensors initially (will be refined by viewport)
    const allIds = data.sensors.map(s => s.id);
    setSubscriptions(allIds);
  } catch (err) {
    console.error('Failed to fetch sensors:', err);
  }
};

// Update connection status in store
const updateConnectionStatus = () => {
  store.setConnectionStatus(isConnected.value);
};

onMounted(async () => {
  // Set up message handler
  const unsubscribe = onMessage(handleMessage);
  
  // Fetch sensors
  await fetchSensors();
  loading.value = false;
  
  // Watch connection status
  updateConnectionStatus();
});
</script>
