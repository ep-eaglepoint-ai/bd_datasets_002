<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  theme: 'light' | 'dark'
}>()

const emit = defineEmits<{
  'update:theme': [theme: 'light' | 'dark']
}>()

const toggleTheme = () => {
  emit('update:theme', props.theme === 'light' ? 'dark' : 'light')
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggleTheme()
  }
}
</script>

<template>
  <button 
    class="theme-toggle"
    @click="toggleTheme"
    @keydown="handleKeyDown"
    :aria-label="`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`"
    :aria-pressed="theme === 'dark'"
  >
    <svg v-if="theme === 'light'" class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <svg v-else class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
      <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  width: 48px;
  height: 48px;
  border: 2px solid var(--border-color);
  background: var(--surface-primary);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px var(--shadow-color);
  z-index: 100;
}

.theme-toggle:hover {
  transform: rotate(20deg) scale(1.05);
  border-color: var(--primary-color);
}

.theme-toggle:active {
  transform: rotate(20deg) scale(0.95);
}

.icon {
  width: 24px;
  height: 24px;
  color: var(--text-primary);
  transition: all 0.3s ease;
}

@media (max-width: 640px) {
  .theme-toggle {
    top: 1rem;
    right: 1rem;
    width: 40px;
    height: 40px;
  }

  .icon {
    width: 20px;
    height: 20px;
  }
}
</style>
