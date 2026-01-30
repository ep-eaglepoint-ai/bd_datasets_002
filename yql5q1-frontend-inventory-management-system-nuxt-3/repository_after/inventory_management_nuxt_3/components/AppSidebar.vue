<template>
  <aside class="sticky top-0 hidden h-screen w-72 flex-col border-r border-slate-200 bg-white/90 px-6 py-8 backdrop-blur-xl lg:flex">
    <div class="rounded-2xl bg-gradient-to-br from-slate-900 via-brand-700 to-indigo-600 p-5 text-white shadow-soft">
      <p class="text-xs uppercase tracking-[0.3em] text-white/70">Inventory Management</p>
      <h2 class="mt-1 text-xl font-semibold">Inventory Management</h2>
      <p class="mt-2 text-xs text-white/80">Product visibility and stock readiness in one place.</p>
      <div class="mt-4 flex items-center justify-between text-xs">
        <span class="text-white/80">SKUs</span>
        <span class="font-semibold">{{ totalProducts }}</span>
      </div>
    </div>

    <nav class="mt-8 flex flex-1 flex-col gap-2">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="group rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
        active-class="border-slate-900 bg-slate-900/5 text-slate-900"
      >
        <span class="flex items-center gap-3">
          <span class="text-base text-slate-400 transition group-hover:text-slate-900">{{ item.symbol }}</span>
          <span>
            {{ item.label }}
            <span class="block text-xs font-normal text-slate-400">{{ item.description }}</span>
          </span>
        </span>
      </NuxtLink>
    </nav>

    <div class="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs text-slate-500">
      <p class="font-semibold text-slate-700">Need a quick audit?</p>
      <p class="mt-1">
        Export the catalog or import a JSON snapshot from the products screen.
      </p>
      <NuxtLink
        to="/products"
        class="mt-3 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700 shadow-sm transition-colors duration-150 hover:border-brand-300 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        Open products →
      </NuxtLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
const store = useProductsStore()

const navItems = [
  { to: '/', label: 'Dashboard', description: 'Portfolio overview', symbol: '▣' },
  { to: '/products', label: 'Products', description: 'Catalog & stock', symbol: '◇' },
  { to: '/products/add', label: 'Add Product', description: 'Create new SKU', symbol: '＋' }
]

const totalProducts = computed(() => store.totalProducts)
</script>
