<script setup lang="ts">
import { computed } from 'vue'
import type { BmiResult, UnitSystem } from '../composables/useBmiCalculator'
import GaugeBar from './GaugeBar.vue'

const props = defineProps<{
  result: BmiResult
  unitSystem: UnitSystem
}>()

const gaugePosition = computed(() => {
  const bmi = props.result.bmi
  // Map BMI to 0-100 scale (15-40 BMI range)
  const minBmi = 15
  const maxBmi = 40
  const position = ((bmi - minBmi) / (maxBmi - minBmi)) * 100
  return Math.max(0, Math.min(100, position))
})

const categoryClass = computed(() => {
  return props.result.category.toLowerCase()
})

const weightUnit = computed(() => props.unitSystem === 'metric' ? 'kg' : 'lbs')
</script>

<template>
  <div class="result-card">
    <div class="result-header">
      <h2 class="result-title">Your BMI Result</h2>
      <div :class="['category-badge', categoryClass]">
        {{ result.category }}
      </div>
    </div>

    <div class="bmi-display">
      <span class="bmi-value">{{ result.bmi }}</span>
      <span class="bmi-label">BMI</span>
    </div>

    <GaugeBar :bmi="result.bmi" :position="gaugePosition" />

    <div class="guidance-section">
      <p class="guidance-text">{{ result.guidance }}</p>
    </div>

    <div class="healthy-range">
      <h3 class="range-title">Healthy Weight Range</h3>
      <p class="range-values">
        {{ result.healthyWeightRange.min }} - {{ result.healthyWeightRange.max }} {{ weightUnit }}
      </p>
      
      <p v-if="result.weightDifference" class="weight-suggestion">
        To reach a normal BMI, consider 
        <strong>{{ result.weightDifference.direction === 'gain' ? 'gaining' : 'losing' }}</strong>
        approximately 
        <strong>{{ Math.abs(result.weightDifference.amount) }} {{ weightUnit }}</strong>
      </p>
    </div>
  </div>
</template>

<style scoped>
.result-card {
  background: var(--surface-primary);
  border: 2px solid var(--border-color);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 8px 24px var(--shadow-color);
  animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.result-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.category-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-badge.underweight {
  background: var(--underweight-color);
  color: white;
}

.category-badge.normal {
  background: var(--normal-color);
  color: white;
}

.category-badge.overweight {
  background: var(--overweight-color);
  color: white;
}

.category-badge.obese {
  background: var(--obese-color);
  color: white;
}

.bmi-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin: 1.5rem 0;
}

.bmi-value {
  font-size: 4rem;
  font-weight: 800;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.bmi-label {
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.guidance-section {
  margin: 1.5rem 0;
  padding: 1.25rem;
  background: var(--surface-secondary);
  border-radius: 12px;
  border-left: 4px solid var(--primary-color);
}

.guidance-text {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.6;
  font-size: 0.95rem;
}

.healthy-range {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.range-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
}

.range-values {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0 0 1rem 0;
}

.weight-suggestion {
  margin: 0;
  padding: 1rem;
  background: var(--surface-tertiary);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.weight-suggestion strong {
  color: var(--primary-color);
}

@media (max-width: 640px) {
  .result-card {
    padding: 1.5rem;
  }

  .result-title {
    font-size: 1.25rem;
  }

  .bmi-value {
    font-size: 3rem;
  }

  .category-badge {
    font-size: 0.75rem;
    padding: 0.375rem 0.75rem;
  }
}
</style>
