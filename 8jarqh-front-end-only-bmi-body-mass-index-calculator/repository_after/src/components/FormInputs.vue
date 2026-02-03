<script setup lang="ts">
import { computed } from 'vue'
import type { UnitSystem, ValidationError } from '../composables/useBmiCalculator'

const props = defineProps<{
  unitSystem: UnitSystem
  height: number | null
  weight: number | null
  heightFeet: number | null
  heightInches: number | null
  errors: ValidationError
  isValid: boolean
}>()

const emit = defineEmits<{
  'update:height': [value: number | null]
  'update:weight': [value: number | null]
  'update:heightFeet': [value: number | null]
  'update:heightInches': [value: number | null]
  'toggle-unit': []
  'calculate': []
}>()

const handleNumberInput = (event: Event, field: string) => {
  const target = event.target as HTMLInputElement
  const value = target.value === '' ? null : parseFloat(target.value)
  emit(`update:${field}` as any, value)
}

const handleKeyDown = (event: KeyboardEvent, action: () => void) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    action()
  }
}

const handleCalculateKeyDown = (event: KeyboardEvent) => {
  if (isValid && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault()
    emit('calculate')
  }
}
</script>

<template>
  <div class="form-inputs">
    <div class="unit-toggle" role="group" aria-label="Unit system selection">
      <button 
        type="button"
        :class="['unit-btn', { active: unitSystem === 'metric' }]"
        @click="emit('toggle-unit')"
        @keydown="handleKeyDown($event, () => emit('toggle-unit'))"
        :aria-pressed="unitSystem === 'metric'"
        aria-label="Switch to metric units"
      >
        Metric (cm/kg)
      </button>
      <button 
        type="button"
        :class="['unit-btn', { active: unitSystem === 'imperial' }]"
        @click="emit('toggle-unit')"
        @keydown="handleKeyDown($event, () => emit('toggle-unit'))"
        :aria-pressed="unitSystem === 'imperial'"
        aria-label="Switch to imperial units"
      >
        Imperial (ft/in/lb)
      </button>
    </div>

    <div class="input-group">
      <label for="height" class="input-label">
        Height
        <span class="unit-hint">{{ unitSystem === 'metric' ? '(cm)' : '(ft/in)' }}</span>
      </label>
      
      <div v-if="unitSystem === 'metric'" class="input-wrapper">
        <input
          id="height"
          type="number"
          :value="height ?? ''"
          @input="handleNumberInput($event, 'height')"
          @keydown.enter="isValid && emit('calculate')"
          placeholder="170"
          min="50"
          max="300"
          step="1"
          class="input-field"
          :class="{ error: errors.height }"
          aria-describedby="height-error"
          aria-invalid="!!errors.height"
        />
        <span class="input-suffix">cm</span>
      </div>

      <div v-else class="imperial-height">
        <div class="input-wrapper">
          <input
            id="height-feet"
            type="number"
            :value="heightFeet ?? ''"
            @input="handleNumberInput($event, 'heightFeet')"
            @keydown.enter="isValid && emit('calculate')"
            placeholder="5"
            min="1"
            max="10"
            step="1"
            class="input-field"
            :class="{ error: errors.height }"
            aria-label="Height in feet"
            aria-invalid="!!errors.height"
          />
          <span class="input-suffix">ft</span>
        </div>
        <div class="input-wrapper">
          <input
            id="height-inches"
            type="number"
            :value="heightInches ?? ''"
            @input="handleNumberInput($event, 'heightInches')"
            @keydown.enter="isValid && emit('calculate')"
            placeholder="9"
            min="0"
            max="11"
            step="1"
            class="input-field"
            :class="{ error: errors.height }"
            aria-label="Height in inches"
            aria-invalid="!!errors.height"
          />
          <span class="input-suffix">in</span>
        </div>
      </div>

      <span v-if="errors.height" id="height-error" class="error-message">
        {{ errors.height }}
      </span>
    </div>

    <div class="input-group">
      <label for="weight" class="input-label">
        Weight
        <span class="unit-hint">{{ unitSystem === 'metric' ? '(kg)' : '(lbs)' }}</span>
      </label>
      
      <div class="input-wrapper">
        <input
          id="weight"
          type="number"
          :value="weight ?? ''"
          @input="handleNumberInput($event, 'weight')"
          @keydown.enter="isValid && emit('calculate')"
          :placeholder="unitSystem === 'metric' ? '70' : '154'"
          :min="unitSystem === 'metric' ? 2 : 4"
          :max="unitSystem === 'metric' ? 600 : 1300"
          step="0.1"
          class="input-field"
          :class="{ error: errors.weight }"
          aria-describedby="weight-error"
          aria-invalid="!!errors.weight"
        />
        <span class="input-suffix">{{ unitSystem === 'metric' ? 'kg' : 'lbs' }}</span>
      </div>

      <span v-if="errors.weight" id="weight-error" class="error-message">
        {{ errors.weight }}
      </span>
    </div>

    <button
      type="button"
      class="calculate-btn"
      :disabled="!isValid"
      @click="emit('calculate')"
      @keydown="handleCalculateKeyDown"
      aria-label="Calculate BMI"
    >
      Calculate BMI
    </button>
  </div>
</template>

<style scoped>
.form-inputs {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.unit-toggle {
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem;
  background: var(--surface-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.unit-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.unit-btn:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.unit-btn.active {
  background: var(--primary-gradient);
  color: white;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.unit-hint {
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--text-secondary);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.imperial-height {
  display: flex;
  gap: 0.75rem;
}

.input-field {
  width: 100%;
  padding: 0.875rem 3rem 0.875rem 1rem;
  font-size: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background: var(--surface-primary);
  color: var(--text-primary);
  transition: all 0.3s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-glow);
}

.input-field.error {
  border-color: var(--error-color);
}

.input-field::placeholder {
  color: var(--text-tertiary);
}

.input-suffix {
  position: absolute;
  right: 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  pointer-events: none;
}

.error-message {
  font-size: 0.85rem;
  color: var(--error-color);
  margin-top: -0.25rem;
}

.calculate-btn {
  margin-top: 0.5rem;
  padding: 1rem 2rem;
  font-size: 1.05rem;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  background: var(--primary-gradient);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px var(--shadow-color);
}

.calculate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--shadow-color);
}

.calculate-btn:active:not(:disabled) {
  transform: translateY(0);
}

.calculate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .unit-btn {
    font-size: 0.85rem;
    padding: 0.625rem 0.75rem;
  }
}
</style>
