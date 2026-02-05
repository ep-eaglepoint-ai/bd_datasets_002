<template>
  <div 
    ref="cardRef"
    class="sensor-card"
    :class="{ critical: isAlert }"
    :data-sensor-id="sensorId"
  >
    <div v-if="isAlert" class="alert-badge">CRITICAL</div>
    
    <div class="sensor-header">
      <span class="sensor-id">{{ sensorId }}</span>
      <span class="sensor-type">{{ sensorType }}</span>
    </div>
    
    <div 
      class="sensor-value"
      :class="valueClass"
    >
      {{ formattedValue }}
      <span class="sensor-unit">{{ unit }}</span>
    </div>
    
    <div class="sensor-threshold">
      Threshold: {{ threshold }} {{ unit }}
    </div>
    
    <div class="sparkline-container">
      <Sparkline
        :data="sparklineData"
        :threshold="threshold"
        :is-alert="isAlert"
        :width="sparklineWidth"
        :height="60"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useSensorStore } from '../stores/sensorStore.js';
import Sparkline from './Sparkline.vue';

const props = defineProps({
  sensorId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['mounted', 'unmounted']);

const store = useSensorStore();
const cardRef = ref(null);
const sparklineWidth = ref(250);

// Computed properties
const sensor = computed(() => store.sensorMap.get(props.sensorId));

const sensorType = computed(() => {
  return sensor.value?.type || 'unknown';
});

const threshold = computed(() => {
  return store.getSensorThreshold(props.sensorId) || 80;
});

const unit = computed(() => {
  return sensorType.value === 'vibration' ? 'mm/s' : '°C';
});

const latestValue = computed(() => {
  // Access reactive property directly
  return store.latestValues[props.sensorId];
});

const formattedValue = computed(() => {
  if (!latestValue.value) return '--';
  return latestValue.value.value.toFixed(1);
});

const isAlert = computed(() => {
  // Access reactive property directly
  return store.alertStates[props.sensorId] || false;
});

const valueClass = computed(() => {
  if (!latestValue.value) return '';
  const value = latestValue.value.value;
  if (value > threshold.value) return 'critical';
  if (value > threshold.value * 0.9) return 'warning';
  return 'normal';
});

const sparklineData = computed(() => {
  // This will re-compute when updateCounter changes
  return store.getSensorData(props.sensorId);
});

// Update sparkline width based on container
const updateWidth = () => {
  if (cardRef.value) {
    const containerWidth = cardRef.value.offsetWidth - 32; // padding
    sparklineWidth.value = Math.max(100, containerWidth);
  }
};

onMounted(() => {
  updateWidth();
  window.addEventListener('resize', updateWidth);
  emit('mounted', cardRef.value);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth);
  emit('unmounted', props.sensorId);
});
</script>
