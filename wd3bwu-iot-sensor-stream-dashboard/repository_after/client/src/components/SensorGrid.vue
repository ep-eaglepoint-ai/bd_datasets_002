<template>
  <div class="sensor-grid" ref="gridRef">
    <SensorCard
      v-for="sensor in sensors"
      :key="sensor.id"
      :sensor-id="sensor.id"
      @mounted="handleCardMounted"
      @unmounted="handleCardUnmounted"
    />
  </div>
</template>

<script setup>
/**
 * Sensor Grid Component
 * 
 * Requirement 3: Viewport-based subscriptions
 * Uses Intersection Observer to track visible sensors
 */

import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue';
import { useSensorStore } from '../stores/sensorStore.js';
import SensorCard from './SensorCard.vue';

const emit = defineEmits(['visibilityChange']);

const store = useSensorStore();
const visibleSensors = ref(new Set());
const gridRef = ref(null);
let observer = null;
let initialCheckDone = false;

const sensors = computed(() => store.sensors);

const handleCardMounted = (element) => {
  if (!element || !observer) return;
  
  const sensorId = element.dataset?.sensorId;
  if (sensorId) {
    observer.observe(element);
  }
};

const handleCardUnmounted = (sensorId) => {
  visibleSensors.value.delete(sensorId);
  emitVisibilityChange();
};

const emitVisibilityChange = () => {
  const visible = Array.from(visibleSensors.value);
  emit('visibilityChange', visible);
};

const handleIntersection = (entries) => {
  let changed = false;
  
  for (const entry of entries) {
    const sensorId = entry.target.dataset?.sensorId;
    if (!sensorId) continue;
    
    if (entry.isIntersecting) {
      if (!visibleSensors.value.has(sensorId)) {
        visibleSensors.value.add(sensorId);
        changed = true;
      }
    } else {
      if (visibleSensors.value.has(sensorId)) {
        visibleSensors.value.delete(sensorId);
        changed = true;
      }
    }
  }
  
  if (changed || !initialCheckDone) {
    initialCheckDone = true;
    emitVisibilityChange();
  }
};

onMounted(() => {
  observer = new IntersectionObserver(handleIntersection, {
    rootMargin: '50px',
    threshold: 0
  });
});

// Watch for sensors to load, then observe all cards
watch(sensors, (newSensors) => {
  if (newSensors.length > 0 && observer) {
    nextTick(() => {
      // Observe all sensor cards that are already in DOM
      const cards = gridRef.value?.querySelectorAll('[data-sensor-id]');
      cards?.forEach(card => {
        observer.observe(card);
      });
    });
  }
}, { immediate: true });

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  visibleSensors.value.clear();
});
</script>
