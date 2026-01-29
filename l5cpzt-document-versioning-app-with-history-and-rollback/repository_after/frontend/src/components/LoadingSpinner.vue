<template>
  <div class="spinner-container" :class="size">
    <div class="spinner"></div>
  </div>
</template>

<script setup>
defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  }
})
</script>

<style scoped>
.spinner-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  border-radius: 50%;
  border-style: solid;
  border-color: var(--primary-500);
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
}

.sm .spinner {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.md .spinner {
  width: 32px;
  height: 32px;
  border-width: 3px;
}

.lg .spinner {
  width: 48px;
  height: 48px;
  border-width: 4px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
