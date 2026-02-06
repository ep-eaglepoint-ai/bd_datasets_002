<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Dashboard</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <StatCard label="Total Products" :value="store.totalProducts" />
      <StatCard label="Total Stock" :value="store.totalStock" />
      <StatCard
        label="Low Stock"
        :value="store.lowStockCount"
        :subtitle="store.lowStockPercentage"
      />
      <StatCard
        label="Out of Stock"
        :value="store.outOfStockCount"
        :subtitle="store.outOfStockPercentage"
      />
    </div>
    <div class="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p class="text-xs font-semibold uppercase text-slate-500">
          Low-stock alerts
        </p>
        <div v-if="lowStockProducts.length" class="mt-4 space-y-3">
          <div
            v-for="product in lowStockProducts"
            :key="product.id"
            class="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-4 py-3"
          >
            <div>
              <p class="text-sm font-semibold text-slate-900">
                {{ product.name }}
              </p>
              <p class="text-xs text-slate-500">SKU {{ product.sku }}</p>
            </div>
            <StatusBadge :status="store.statusByStock(product.stock)" />
          </div>
        </div>
        <p v-else class="mt-4 text-sm text-slate-500">
          No low-stock alerts right now.
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p class="text-xs font-semibold uppercase text-slate-500">
          Data export
        </p>
        <p class="mt-2 text-sm text-slate-600">
          Download a JSON snapshot of inventory.
        </p>
        <button
          @click="exportData"
          :disabled="isExporting"
          class="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Export data
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useProductsStore } from "~/stores/products";
import { useToasts } from "~/composables/useToasts";

const store = useProductsStore();
const { addToast } = useToasts();

const isExporting = ref(false);

const lowStockProducts = computed(() =>
  store.products.filter((product) => product.stock > 0 && product.stock <= 5),
);

const exportData = async () => {
  if (isExporting.value) return;
  isExporting.value = true;
  try {
    if (!store.products || store.products.length === 0) {
      addToast("No data to export.", "warning");
      return;
    }
    const dataStr = JSON.stringify(store.products, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Inventory exported successfully.", "success");
  } catch (error) {
    console.error("Export failed:", error);
    addToast("Failed to export inventory.", "error");
  } finally {
    isExporting.value = false;
  }
};
</script>
