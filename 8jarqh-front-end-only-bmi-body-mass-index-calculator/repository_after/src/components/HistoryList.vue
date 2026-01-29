<script setup lang="ts">
import type { BmiResult, UnitSystem } from '../composables/useBmiCalculator'

interface HistoryEntry extends BmiResult {
  height: string
  weight: string
  unit: UnitSystem
}

const props = defineProps<{
  history: HistoryEntry[]
}>()

const emit = defineEmits<{
  'delete-entry': [index: number]
  'clear-all': []
}>()

const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getCategoryClass = (category: string): string => {
  return category.toLowerCase()
}

const handleKeyDown = (event: KeyboardEvent, action: () => void) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    action()
  }
}

const handleDeleteKeyDown = (event: KeyboardEvent, index: number) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('delete-entry', index)
  }
}

const handleClearKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('clear-all')
  }
}
</script>

<template>
  <div class="history-list">
    <div class="history-header">
      <h3 class="history-title">Calculation History</h3>
      <button 
        v-if="history.length > 0"
        class="clear-btn"
        @click="emit('clear-all')"
        @keydown="handleClearKeyDown"
        aria-label="Clear all history"
      >
        Clear All
      </button>
    </div>

    <div v-if="history.length === 0" class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 11H15M9 15H15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p class="empty-text">No calculations yet</p>
    </div>

    <div v-else class="history-items" role="list" aria-label="BMI calculation history">
      <div 
        v-for="(entry, index) in history" 
        :key="index"
        class="history-item"
        role="listitem"
      >
        <div class="item-main">
          <div class="item-bmi">
            <span class="bmi-number">{{ entry.bmi }}</span>
            <span :class="['category-tag', getCategoryClass(entry.category)]">
              {{ entry.category }}
            </span>
          </div>
          <div class="item-details">
            <span class="detail-text">{{ entry.height }} × {{ entry.weight }}</span>
            <span class="detail-unit">({{ entry.unit }})</span>
          </div>
          <div class="item-date">{{ formatDate(entry.timestamp) }}</div>
        </div>
        <button 
          class="delete-btn"
          @click="emit('delete-entry', index)"
          @keydown="handleDeleteKeyDown($event, index)"
          aria-label="Delete this entry"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-list {
  background: var(--surface-primary);
  border: 2px solid var(--border-color);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px var(--shadow-color);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.history-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.clear-btn {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid var(--border-color);
  background: var(--surface-secondary);
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: var(--error-color);
  color: white;
  border-color: var(--error-color);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1rem;
  gap: 1rem;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--text-tertiary);
  opacity: 0.5;
}

.empty-text {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.history-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.history-items::-webkit-scrollbar {
  width: 6px;
}

.history-items::-webkit-scrollbar-track {
  background: var(--surface-secondary);
  border-radius: 3px;
}

.history-items::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.history-items::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--surface-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.history-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px var(--shadow-color);
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.item-bmi {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bmi-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.category-tag {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.category-tag.underweight {
  background: var(--underweight-color);
  color: white;
}

.category-tag.normal {
  background: var(--normal-color);
  color: white;
}

.category-tag.overweight {
  background: var(--overweight-color);
  color: white;
}

.category-tag.obese {
  background: var(--obese-color);
  color: white;
}

.item-details {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.detail-text {
  font-weight: 500;
}

.detail-unit {
  font-weight: 400;
}

.item-date {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.delete-btn {
  padding: 0.5rem;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn svg {
  width: 20px;
  height: 20px;
}

.delete-btn:hover {
  background: var(--error-color);
  color: white;
}

@media (max-width: 640px) {
  .history-list {
    padding: 1rem;
  }

  .history-title {
    font-size: 1.1rem;
  }

  .bmi-number {
    font-size: 1.25rem;
  }

  .item-details {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>
