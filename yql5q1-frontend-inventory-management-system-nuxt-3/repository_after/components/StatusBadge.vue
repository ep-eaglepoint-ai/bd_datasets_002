<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
    :class="badgeClass"
  >
    {{ status }}
  </span>
</template>

<script setup lang="ts">
import type { StockStatus } from '~/stores/products'

defineProps<{ status: StockStatus }>()

const badgeClass = computed(() => {
  switch (status) {
    case 'In Stock':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
    case 'Low Stock':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
    case 'Out of Stock':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
  }
})
</script>
