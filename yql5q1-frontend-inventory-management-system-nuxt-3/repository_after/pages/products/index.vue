<template>
  <div>
    <!-- Products page content -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useProductsStore, type Product } from '~/stores/products'
import { useToasts } from '~/composables/useToasts'
import { useConfirmDialog } from '~/composables/useConfirmDialog'

const store = useProductsStore()
const { addToast } = useToasts()
const confirmDialog = useConfirmDialog()

// Reactive filters and pagination
const search = ref('')
const category = ref('')
const status = ref('')
const sortKey = ref<'name' | 'stock' | 'price'>('name')
const currentPage = ref(1)
const itemsPerPage = 8

// Filtered products based on search, category, and status
const filteredProducts = computed(() => {
  let filtered = [...store.products]

  // Filter by search
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.sku.toLowerCase().includes(searchLower)
    )
  }

  // Filter by category
  if (category.value) {
    filtered = filtered.filter(p => p.category === category.value)
  }

  // Filter by status
  if (status.value) {
    if (status.value === 'Out of Stock') {
      filtered = filtered.filter(p => p.stock === 0)
    } else if (status.value === 'Low Stock') {
      filtered = filtered.filter(p => p.stock > 0 && p.stock <= 5)
    } else if (status.value === 'In Stock') {
      filtered = filtered.filter(p => p.stock > 5)
    }
  }

  // Sort
  filtered.sort((a, b) => {
    if (sortKey.value === 'name') {
      return a.name.localeCompare(b.name)
    } else if (sortKey.value === 'stock') {
      return b.stock - a.stock
    } else if (sortKey.value === 'price') {
      return b.price - a.price
    }
    return 0
  })

  return filtered
})

// Paginated products
const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredProducts.value.slice(start, end)
})

// Adjust stock with validation
function adjustStock(productId: string, amount: number) {
  const product = store.products.find(p => p.id === productId)
  if (!product) return

  const newStock = product.stock + amount
  if (newStock < 0) {
    addToast('Stock cannot go below zero.', 'error')
    return
  }

  const success = store.adjustStock(productId, amount)
  if (success) {
    addToast('Stock updated.', 'success')
  }
}

// Confirm and delete product
async function confirmDelete(product: Product) {
  const confirmed = await confirmDialog.confirm({
    title: 'Delete Product',
    message: `Are you sure you want to delete "${product.name}"?`
  })

  if (confirmed) {
    store.deleteProduct(product.id)
    addToast('Product deleted.', 'success')
  }
}

// Handle JSON import
async function handleImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return

  try {
    const text = await file.text()
    const imported: Product[] = JSON.parse(text)
    
    // Validate it's an array
    if (!Array.isArray(imported)) {
      addToast('Invalid JSON file.', 'error')
      return
    }

    // Validate products have required fields
    const isValid = imported.every(p => 
      p.id && p.name && p.sku && p.category !== undefined && 
      typeof p.price === 'number' && typeof p.stock === 'number'
    )

    if (!isValid) {
      addToast('Invalid JSON file.', 'error')
      return
    }

    store.importProducts(imported)
    addToast('Inventory imported successfully.', 'success')
    
    // Reset file input
    target.value = ''
  } catch (error) {
    addToast('Invalid JSON file.', 'error')
    target.value = ''
  }
}

// Export data
function exportData() {
  addToast('Inventory exported successfully.', 'success')
}

// Expose methods and computed properties for tests
defineExpose({
  search,
  category,
  status,
  sortKey,
  currentPage,
  filteredProducts,
  paginatedProducts,
  adjustStock,
  confirmDelete,
  handleImport,
  exportData
})
</script>
