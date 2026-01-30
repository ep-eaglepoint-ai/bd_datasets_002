<template>
  <div class="flex items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
    <span>Page {{ currentPage }} of {{ totalPages }}</span>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
        :disabled="currentPage === 1"
        @click="$emit('change', currentPage - 1)"
      >
        Prev
      </button>
      <button
        type="button"
        class="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
        :disabled="currentPage === totalPages"
        @click="$emit('change', currentPage + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ currentPage: number; totalPages: number }>()
defineEmits<{ (e: 'change', page: number): void }>()
</script>
