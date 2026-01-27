<script setup lang="ts">
import type { BmiCategory } from '../composables/useBmiCalculator'

const props = defineProps<{
  bmi: number
  position: number // 0-100 percentage
}>()

const getCategoryColor = (position: number): string => {
  if (position < 25) return 'var(--underweight-color)'
  if (position < 50) return 'var(--normal-color)'
  if (position < 75) return 'var(--overweight-color)'
  return 'var(--obese-color)'
}
</script>

<template>
  <div class="gauge-bar">
    <div class="gauge-track">
      <div class="gauge-segment underweight">
        <span class="segment-label">Under</span>
      </div>
      <div class="gauge-segment normal">
        <span class="segment-label">Normal</span>
      </div>
      <div class="gauge-segment overweight">
        <span class="segment-label">Over</span>
      </div>
      <div class="gauge-segment obese">
        <span class="segment-label">Obese</span>
      </div>
      
      <div 
        class="gauge-marker" 
        :style="{ left: `${position}%`, borderColor: getCategoryColor(position) }"
        role="img"
        :aria-label="`Your BMI is ${bmi}, positioned at ${Math.round(position)}% on the scale`"
      >
        <div class="marker-value">{{ bmi }}</div>
      </div>
    </div>
    
    <div class="gauge-labels">
      <span>15</span>
      <span>18.5</span>
      <span>25</span>
      <span>30</span>
      <span>40</span>
    </div>
  </div>
</template>

<style scoped>
.gauge-bar {
  width: 100%;
  margin: 1.5rem 0;
}

.gauge-track {
  position: relative;
  display: flex;
  height: 50px;
  border-radius: 25px;
  overflow: hidden;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
}

.gauge-segment {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.3s ease;
}

.gauge-segment:hover {
  filter: brightness(1.1);
}

.gauge-segment.underweight {
  background: var(--underweight-color);
}

.gauge-segment.normal {
  background: var(--normal-color);
}

.gauge-segment.overweight {
  background: var(--overweight-color);
}

.gauge-segment.obese {
  background: var(--obese-color);
}

.segment-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.gauge-marker {
  position: absolute;
  top: -8px;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 16px solid;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3));
  transition: left 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.marker-value {
  position: absolute;
  top: -32px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface-primary);
  color: var(--text-primary);
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 2px 8px var(--shadow-color);
  border: 2px solid var(--border-color);
}

.gauge-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  padding: 0 0.25rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
}

@media (max-width: 640px) {
  .gauge-track {
    height: 40px;
  }
  
  .segment-label {
    font-size: 0.7rem;
  }
  
  .marker-value {
    font-size: 0.85rem;
    padding: 0.25rem 0.5rem;
  }
}
</style>
