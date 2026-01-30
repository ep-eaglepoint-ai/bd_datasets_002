<template>
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur-sm sm:px-6 lg:px-10">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-lg font-semibold uppercase text-white">
          IM
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Inventory Management</p>
          <p class="text-lg font-semibold text-slate-900">Inventory Management</p>
          <p class="text-xs text-slate-500">Product visibility and stock coverage in one console.</p>
        </div>
      </div>
      <div class="hidden items-center gap-3 md:flex">
        <NuxtLink
          to="/products"
          class="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors duration-150 hover:border-brand-300 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          Products
        </NuxtLink>
        <NuxtLink
          to="/products/add"
          class="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-soft transition-colors duration-150 hover:from-brand-600 hover:to-indigo-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          New Product
        </NuxtLink>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
      <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors duration-150 hover:border-brand-300 hover:text-brand-700">
        <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
        Platform status: Green
      </span>
      <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors duration-150 hover:border-brand-300 hover:text-brand-700">
        SLA 99.9%
      </span>
      <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors duration-150 hover:border-brand-300 hover:text-brand-700">
        Last sync {{ lastSync }}
      </span>
    </div>

    <nav class="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 md:hidden">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors duration-150 hover:border-brand-300 hover:text-brand-700"
        active-class="bg-brand-100 text-brand-800"
      >
        Dashboard
      </NuxtLink>
      <NuxtLink
        to="/products"
        class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors duration-150 hover:border-brand-300 hover:text-brand-700"
        active-class="bg-brand-100 text-brand-800"
      >
        Products
      </NuxtLink>
      <NuxtLink
        to="/products/add"
        class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors duration-150 hover:border-brand-300 hover:text-brand-700"
        active-class="bg-brand-100 text-brand-800"
      >
        Add Product
      </NuxtLink>
    </nav>
  </header>
</template>

<script setup lang="ts">
const lastSync = computed(() => {
  const now = new Date()
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})
</script>
