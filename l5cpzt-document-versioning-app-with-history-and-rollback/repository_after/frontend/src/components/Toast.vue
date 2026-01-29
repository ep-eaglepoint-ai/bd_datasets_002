<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast" :class="type">
        <span class="toast-icon">{{ icon }}</span>
        <span class="toast-message">{{ message }}</span>
        <button @click="hide" class="toast-close">×</button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'

const visible = ref(false)
const message = ref('')
const type = ref('success')

const icon = computed(() => {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }
  return icons[type.value] || icons.info
})

let timeout = null

const show = (msg, msgType = 'success') => {
  message.value = msg
  type.value = msgType
  visible.value = true
  
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    visible.value = false
  }, 4000)
}

const hide = () => {
  visible.value = false
  clearTimeout(timeout)
}

defineExpose({ show, hide })
</script>

<style scoped>
.toast {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-lg);
  background: white;
  box-shadow: var(--shadow-xl);
  z-index: 9999;
  max-width: 400px;
  animation: slideIn 0.3s ease;
}

.toast.success {
  border-left: 4px solid var(--success-500);
}

.toast.error {
  border-left: 4px solid var(--error-500);
}

.toast.warning {
  border-left: 4px solid var(--warning-500);
}

.toast.info {
  border-left: 4px solid var(--info-500);
}

.toast-icon {
  font-size: 1.25rem;
  font-weight: bold;
}

.toast.success .toast-icon { color: var(--success-500); }
.toast.error .toast-icon { color: var(--error-500); }
.toast.warning .toast-icon { color: var(--warning-500); }
.toast.info .toast-icon { color: var(--info-500); }

.toast-message {
  flex: 1;
  font-size: 0.9375rem;
  color: var(--gray-700);
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--gray-400);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.toast-close:hover {
  color: var(--gray-600);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
