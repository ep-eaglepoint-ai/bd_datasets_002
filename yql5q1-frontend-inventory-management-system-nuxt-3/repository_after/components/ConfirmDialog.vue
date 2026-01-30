<template>
  <transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h3 class="text-base font-semibold">{{ title }}</h3>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">{{ message }}</p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
            @click="handleCancel"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            @click="handleConfirm"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
const { isOpen, title, message, handleCancel, handleConfirm } = useConfirmDialog()
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
