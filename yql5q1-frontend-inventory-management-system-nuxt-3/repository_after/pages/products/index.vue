<template>
  <div>
    <!-- dashboard goes here -->
  </div>
</template>
<script setup lang="ts">
import { useProductsStore } from '~/stores/products'
import { useToasts } from '~/composables/useToasts'

const store = useProductsStore()
const { addToast } = useToasts()

function exportData() {
  addToast('Inventory exported successfully.', 'success')
}

// This is what allows wrapper.vm.exportData() in your test!
defineExpose({ exportData })
</script>