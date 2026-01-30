import { defineStore } from 'pinia'

export type Product = {
  id: string
  name: string
  sku: string
  category: string
  price: number
  stock: number
  createdAt: string
  updatedAt: string
}

import { ref, computed } from 'vue'

export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([])

  function addProduct(product: Product) {
    products.value.push(product)
    // Optionally update LocalStorage here
  }

  function updateProduct(updated: Product) {
    const idx = products.value.findIndex(p => p.id === updated.id)
    if (idx !== -1) products.value[idx] = updated
  }

  function deleteProduct(id: string) {
    products.value = products.value.filter(p => p.id !== id)
  }

  function initialize(newProducts: Product[]) {
    products.value = newProducts
  }

  const totalProducts = computed(() => products.value.length)
  const inStockCount = computed(() => products.value.filter(p => p.stock > 5).length)
  const lowStockCount = computed(() => products.value.filter(p => p.stock > 0 && p.stock <= 5).length)
  const outOfStockCount = computed(() => products.value.filter(p => p.stock === 0).length)

  const inStockPercentage = computed(() =>
    totalProducts.value ? Math.round((inStockCount.value / totalProducts.value) * 100) + '%' : '0%'
  )
  const lowStockPercentage = computed(() =>
    totalProducts.value ? Math.round((lowStockCount.value / totalProducts.value) * 100) + '%' : '0%'
  )
  const outOfStockPercentage = computed(() =>
    totalProducts.value ? Math.round((outOfStockCount.value / totalProducts.value) * 100) + '%' : '0%'
  )

  const categories = computed(() => {
    const cats = new Set<string>()
    products.value.forEach(p => cats.add(p.category))
    return Array.from(cats)
  })

  return {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    initialize,
    totalProducts,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    inStockPercentage,
    lowStockPercentage,
    outOfStockPercentage,
    categories
  }
})