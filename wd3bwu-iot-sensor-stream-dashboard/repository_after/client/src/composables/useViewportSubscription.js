/**
 * Viewport Subscription Composable
 * 
 * Requirement 3: A client should only receive data for the sensors 
 * currently visible in the viewport.
 * 
 * Uses Intersection Observer to track which sensors are visible
 * and updates WebSocket subscriptions accordingly.
 */

import { ref, onMounted, onUnmounted } from 'vue';
import { debounce } from '../utils/performanceOptimizations.js';

/**
 * @param {Function} onVisibilityChange - Callback with visible sensor IDs
 * @param {object} options - IntersectionObserver options
 */
export function useViewportSubscription(onVisibilityChange, options = {}) {
  const {
    rootMargin = '100px',  // Pre-load sensors slightly outside viewport
    threshold = 0,
    debounceMs = 100
  } = options;

  const visibleSensors = ref(new Set());
  let observer = null;
  const sensorElements = new Map(); // sensorId -> element

  // Debounced callback to avoid rapid-fire subscription updates
  const notifyChange = debounce(() => {
    const visible = Array.from(visibleSensors.value);
    onVisibilityChange(visible);
  }, debounceMs);

  const handleIntersection = (entries) => {
    let changed = false;
    
    for (const entry of entries) {
      const sensorId = entry.target.dataset.sensorId;
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
    
    if (changed) {
      notifyChange();
    }
  };

  const observe = (element, sensorId) => {
    if (!observer) return;
    
    element.dataset.sensorId = sensorId;
    sensorElements.set(sensorId, element);
    observer.observe(element);
  };

  const unobserve = (sensorId) => {
    const element = sensorElements.get(sensorId);
    if (element && observer) {
      observer.unobserve(element);
      sensorElements.delete(sensorId);
      visibleSensors.value.delete(sensorId);
    }
  };

  const initObserver = () => {
    observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold
    });
  };

  const destroyObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    sensorElements.clear();
    visibleSensors.value.clear();
  };

  onMounted(() => {
    initObserver();
  });

  onUnmounted(() => {
    notifyChange.cancel();
    destroyObserver();
  });

  return {
    visibleSensors,
    observe,
    unobserve,
    getVisibleCount: () => visibleSensors.value.size
  };
}
