<template>
  <section class="space-y-6">
    <div>
      <p class="text-sm text-slate-500 dark:text-slate-400">Overview</p>
      <h1 class="text-2xl font-semibold">Inventory dashboard</h1>
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <StatCard
        label="Total products"
        :value="store.totalProducts"
        trend="Active SKUs"
        trend-class="text-sky-600"
      />
      <StatCard
        label="Total stock"
        :value="store.totalStock"
        trend="Units available"
        trend-class="text-emerald-600"
      />
      <StatCard
        label="Low stock alerts"
        :value="store.lowStockCount"
        trend="Requires attention"
        trend-class="text-amber-600"
        subtitle="Products with fewer than 10 units"
      />
    </div>

    <div class="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase text-slate-500">Stock health</p>
            <h2 class="mt-2 text-lg font-semibold">Inventory status breakdown</h2>
          </div>
          <NuxtLink
            to="/products"
            class="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            View products
          </NuxtLink>
        </div>
        <div class="mt-6 space-y-4">
          <div class="flex items-center justify-between text-sm">
            <span>In stock</span>
            <span class="font-semibold">{{ inStockCount }}</span>
          </div>
          <div class="h-2 w-full rounded-full bg-emerald-100 dark:bg-emerald-500/20">
            <div class="h-2 rounded-full bg-emerald-500" :style="{ width: inStockPercentage }"></div>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span>Low stock</span>
            <span class="font-semibold">{{ store.lowStockCount }}</span>
          </div>
          <div class="h-2 w-full rounded-full bg-amber-100 dark:bg-amber-500/20">
            <div class="h-2 rounded-full bg-amber-500" :style="{ width: lowStockPercentage }"></div>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span>Out of stock</span>
            <span class="font-semibold">{{ store.outOfStockCount }}</span>
          </div>
          <div class="h-2 w-full rounded-full bg-rose-100 dark:bg-rose-500/20">
            <div class="h-2 rounded-full bg-rose-500" :style="{ width: outOfStockPercentage }"></div>
          </div>
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h2 class="text-lg font-semibold">Quick actions</h2>
        <div class="mt-4 space-y-3 text-sm">
          <NuxtLink
            to="/products/add"
            class="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition hover:border-brand-300 dark:border-slate-700"
          >
            <span>Add new product</span>
            <span class="text-xs text-slate-500">Create SKU</span>
          </NuxtLink>
          <NuxtLink
            to="/products"
            class="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition hover:border-brand-300 dark:border-slate-700"
          >
            <span>Review low stock</span>
            <span class="text-xs text-slate-500">{{ store.lowStockCount }} alerts</span>
          </NuxtLink>
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-brand-300 dark:border-slate-700"
            @click="exportData"
          >
            <span>Export inventory</span>
            <span class="text-xs text-slate-500">JSON file</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const store = useProductsStore()
const { addToast } = useToasts()

const inStockCount = computed(() => store.totalProducts - store.lowStockCount - store.outOfStockCount)
const total = computed(() => store.totalProducts || 1)

const inStockPercentage = computed(() => `${Math.round((inStockCount.value / total.value) * 100)}%`)
const lowStockPercentage = computed(() => `${Math.round((store.lowStockCount / total.value) * 100)}%`)
const outOfStockPercentage = computed(() => `${Math.round((store.outOfStockCount / total.value) * 100)}%`)

const exportData = () => {
  const data = JSON.stringify(store.products, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `inventory-export-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
  addToast('Inventory exported successfully.', 'success')
}
</script>
