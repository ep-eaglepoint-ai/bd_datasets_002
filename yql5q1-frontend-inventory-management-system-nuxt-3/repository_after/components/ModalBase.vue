<template>
  <transition name="fade">
    <div
      v-if="open"
      class="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 class="text-base font-semibold">{{ title }}</h3>
          <button
            type="button"
            class="text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>
        <div class="px-6 py-6">
          <slot />
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
defineProps<{ open: boolean; title: string }>()
defineEmits<{ (e: 'close'): void }>()
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
