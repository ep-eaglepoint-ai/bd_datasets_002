<template>
  <div class="fixed bottom-6 right-6 z-50 flex w-80 flex-col gap-3">
    <transition-group name="toast" tag="div" class="flex flex-col gap-3">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-soft dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p
              class="text-xs font-semibold uppercase"
              :class="{
                'text-emerald-600': toast.type === 'success',
                'text-rose-600': toast.type === 'error',
                'text-sky-600': toast.type === 'info'
              }"
            >
              {{ toast.type }}
            </p>
            <p class="mt-1 text-slate-700 dark:text-slate-200">{{ toast.message }}</p>
          </div>
          <button
            type="button"
            class="text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
            @click="removeToast(toast.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
const { toasts, removeToast } = useToasts()
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
