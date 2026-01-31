<template>
  <div class="load-meter">
    <div class="meter-header">
      <h2>⚡ Current Consumption</h2>
      <span :class="['status-badge', status]">{{ statusLabel }}</span>
    </div>
    
    <div class="meter-display">
      <div class="meter-value">
        <span class="current">{{ currentLoad.toFixed(1) }}</span>
        <span class="separator">/</span>
        <span class="max">{{ maxLoad }}</span>
        <span class="unit">W</span>
      </div>
      
      <div class="meter-bar-container">
        <div 
          class="meter-bar" 
          :style="{ width: percentage + '%' }"
          :class="status"
        >
          <div class="meter-glow"></div>
        </div>
        <div class="meter-markers">
          <span class="marker" style="left: 70%">70%</span>
          <span class="marker" style="left: 90%">90%</span>
        </div>
      </div>
      
      <div class="meter-percentage">
        {{ percentage.toFixed(1) }}% utilized
      </div>
    </div>

    <div class="meter-info">
      <div class="info-item">
        <span class="label">Available Capacity:</span>
        <span class="value">{{ availableCapacity.toFixed(1) }}W</span>
      </div>
      <div class="info-item">
        <span class="label">Safety Limit:</span>
        <span class="value">{{ maxLoad }}W</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentLoad: {
    type: Number,
    required: true,
    default: 0
  },
  maxLoad: {
    type: Number,
    required: true,
    default: 5000
  },
  status: {
    type: String,
    required: true,
    default: 'safe'
  }
})

const percentage = computed(() => {
  return Math.min((props.currentLoad / props.maxLoad) * 100, 100)
})

const availableCapacity = computed(() => {
  return Math.max(props.maxLoad - props.currentLoad, 0)
})

const statusLabel = computed(() => {
  switch (props.status) {
    case 'critical':
      return '🔴 CRITICAL'
    case 'warning':
      return '🟡 WARNING'
    default:
      return '🟢 SAFE'
  }
})
</script>

<style scoped>
.load-meter {
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.meter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.meter-header h2 {
  font-size: 1.3rem;
  color: #fff;
  margin: 0;
}

.status-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.safe {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.status-badge.warning {
  background: rgba(255, 200, 0, 0.2);
  color: #ffc800;
  border: 1px solid rgba(255, 200, 0, 0.3);
}

.status-badge.critical {
  background: rgba(255, 100, 100, 0.2);
  color: #ff6464;
  border: 1px solid rgba(255, 100, 100, 0.3);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.meter-display {
  margin-bottom: 20px;
}

.meter-value {
  text-align: center;
  margin-bottom: 16px;
}

.meter-value .current {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.meter-value .separator {
  color: #555;
  font-size: 2rem;
  margin: 0 8px;
}

.meter-value .max {
  font-size: 1.5rem;
  color: #888;
}

.meter-value .unit {
  font-size: 1.2rem;
  color: #666;
  margin-left: 4px;
}

.meter-bar-container {
  position: relative;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 8px;
}

.meter-bar {
  height: 100%;
  border-radius: 12px;
  transition: width 0.5s ease, background 0.3s ease;
  position: relative;
  overflow: hidden;
}

.meter-bar.safe {
  background: linear-gradient(90deg, #00ff88, #00d4ff);
}

.meter-bar.warning {
  background: linear-gradient(90deg, #ffc800, #ff9500);
}

.meter-bar.critical {
  background: linear-gradient(90deg, #ff6464, #ff3333);
}

.meter-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.3), transparent);
  border-radius: 12px 12px 0 0;
}

.meter-markers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
}

.meter-markers .marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
  border-left: 1px dashed rgba(255, 255, 255, 0.3);
  padding-left: 4px;
  height: 100%;
  display: flex;
  align-items: center;
}

.meter-percentage {
  text-align: center;
  color: #888;
  font-size: 0.9rem;
}

.meter-info {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 0.8rem;
  color: #666;
}

.info-item .value {
  font-size: 1.1rem;
  color: #00d4ff;
  font-weight: 600;
}
</style>