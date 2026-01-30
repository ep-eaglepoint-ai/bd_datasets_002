<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
    <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{{ label }}</p>
    <div class="mt-3 flex items-end justify-between">
      <p class="text-2xl font-semibold">{{ value }}</p>
      <span class="text-xs font-medium" :class="trendClass">{{ trend }}</span>
    </div>
    <p v-if="subtitle" class="mt-2 text-xs text-slate-500 dark:text-slate-400">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  trend?: string
  subtitle?: string
  trendClass?: string
}>()
</script>
