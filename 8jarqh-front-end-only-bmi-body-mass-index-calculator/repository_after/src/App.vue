<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBmiCalculator } from './composables/useBmiCalculator'
import { useAppStorage } from './composables/useAppStorage'
import FormInputs from './components/FormInputs.vue'
import ResultCard from './components/ResultCard.vue'
import HistoryList from './components/HistoryList.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import type { BmiResult } from './composables/useBmiCalculator'

// Theme management
const theme = useAppStorage<'light' | 'dark'>('bmi_theme', 'light')

// BMI Calculator
const calculator = useBmiCalculator()

// Current result
const currentResult = ref<BmiResult | null>(null)

// History management
interface HistoryEntry extends BmiResult {
  height: string
  weight: string
  unit: 'metric' | 'imperial'
}

const history = useAppStorage<HistoryEntry[]>('bmi_history', [])

// Persist inputs
const savedInputs = useAppStorage<{
  unitSystem: 'metric' | 'imperial'
  height: number | null
  weight: number | null
  heightFeet: number | null
  heightInches: number | null
}>('bmi_inputs', {
  unitSystem: 'metric',
  height: null,
  weight: null,
  heightFeet: null,
  heightInches: null
})

// Restore saved inputs on mount
onMounted(() => {
  calculator.unitSystem.value = savedInputs.value.unitSystem
  calculator.height.value = savedInputs.value.height
  calculator.weight.value = savedInputs.value.weight
  calculator.heightFeet.value = savedInputs.value.heightFeet
  calculator.heightInches.value = savedInputs.value.heightInches
  
  // Apply theme
  document.documentElement.setAttribute('data-theme', theme.value)
})

// Save inputs whenever they change
const saveInputs = () => {
  savedInputs.value = {
    unitSystem: calculator.unitSystem.value,
    height: calculator.height.value,
    weight: calculator.weight.value,
    heightFeet: calculator.heightFeet.value,
    heightInches: calculator.heightInches.value
  }
}

const handleCalculate = () => {
  const result = calculator.calculateBmi()
  if (result) {
    currentResult.value = result
    
    // Add to history
    const heightStr = calculator.unitSystem.value === 'metric'
      ? `${calculator.height.value} cm`
      : `${calculator.heightFeet.value}' ${calculator.heightInches.value}"`
    
    const weightStr = calculator.unitSystem.value === 'metric'
      ? `${calculator.weight.value} kg`
      : `${calculator.weight.value} lbs`
    
    const entry: HistoryEntry = {
      ...result,
      height: heightStr,
      weight: weightStr,
      unit: calculator.unitSystem.value
    }
    
    // Keep only last 10 entries
    history.value = [entry, ...history.value].slice(0, 10)
  }
}

const handleToggleUnit = () => {
  calculator.toggleUnit()
  saveInputs()
}

const handleDeleteEntry = (index: number) => {
  history.value = history.value.filter((_, i) => i !== index)
}

const handleClearHistory = () => {
  if (confirm('Are you sure you want to clear all history?')) {
    history.value = []
    currentResult.value = null
  }
}

const handleThemeChange = (newTheme: 'light' | 'dark') => {
  theme.value = newTheme
  document.documentElement.setAttribute('data-theme', newTheme)
}
</script>

<template>
  <div class="app">
    <ThemeToggle :theme="theme" @update:theme="handleThemeChange" />
    
    <div class="container">
      <header class="header">
        <h1 class="title">BMI Calculator</h1>
        <p class="subtitle">Track your Body Mass Index with precision</p>
      </header>

      <div class="content">
        <div class="main-section">
          <FormInputs
            :unit-system="calculator.unitSystem.value"
            :height="calculator.height.value"
            :weight="calculator.weight.value"
            :height-feet="calculator.heightFeet.value"
            :height-inches="calculator.heightInches.value"
            :errors="calculator.errors.value"
            :is-valid="calculator.isValid.value"
            @update:height="(v) => { calculator.height.value = v; saveInputs() }"
            @update:weight="(v) => { calculator.weight.value = v; saveInputs() }"
            @update:height-feet="(v) => { calculator.heightFeet.value = v; saveInputs() }"
            @update:height-inches="(v) => { calculator.heightInches.value = v; saveInputs() }"
            @toggle-unit="handleToggleUnit"
            @calculate="handleCalculate"
          />

          <ResultCard
            v-if="currentResult"
            :result="currentResult"
            :unit-system="calculator.unitSystem.value"
          />
        </div>

        <aside class="sidebar">
          <HistoryList
            :history="history"
            @delete-entry="handleDeleteEntry"
            @clear-all="handleClearHistory"
          />
        </aside>
      </div>

      <footer class="footer">
        <p>BMI categories are based on WHO standards. Consult a healthcare professional for personalized advice.</p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  padding: 2rem 1rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.title {
  font-size: 3rem;
  font-weight: 800;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
  font-weight: 400;
}

.content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 3rem;
}

.main-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.sidebar {
  display: flex;
  flex-direction: column;
}

.footer {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-tertiary);
  font-size: 0.9rem;
  border-top: 1px solid var(--border-color);
}

.footer p {
  margin: 0;
}

@media (max-width: 968px) {
  .content {
    grid-template-columns: 1fr;
  }
  
  .sidebar {
    order: 2;
  }
}

@media (max-width: 640px) {
  .app {
    padding: 1rem 0.75rem;
  }

  .title {
    font-size: 2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .header {
    margin-bottom: 2rem;
  }

  .content {
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
}
</style>
