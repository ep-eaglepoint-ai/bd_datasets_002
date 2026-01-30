<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Dashboard</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <StatCard label="Total Products" :value="store.totalProducts" />
      <StatCard label="In Stock" :value="store.inStockCount" :subtitle="store.inStockPercentage" />
      <StatCard label="Low Stock" :value="store.lowStockCount" :subtitle="store.lowStockPercentage" />
      <StatCard label="Out of Stock" :value="store.outOfStockCount" :subtitle="store.outOfStockPercentage" />
    </div>
    <button @click="exportData" :disabled="isExporting" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed">
      Export Data
    </button>
  </div>
</template>

<script setup lang="ts">
import { useProductsStore } from '~/stores/products';
import { useToasts } from '~/composables/useToasts';

const store = useProductsStore();
const { addToast } = useToasts();

const isExporting = ref(false);

const exportData = async () => {
  if (isExporting.value) return;
  isExporting.value = true;
  try {
    if (!store.products || store.products.length === 0) {
      addToast('No data to export.', 'warning');
      return;
    }
    const dataStr = JSON.stringify(store.products, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Inventory exported successfully.', 'success');
  } catch (error) {
    console.error('Export failed:', error);
    addToast('Failed to export inventory.', 'error');
  } finally {
    isExporting.value = false;
  }
};

// Expose for testing
defineExpose({
  exportData,
  store,
});
</script>
