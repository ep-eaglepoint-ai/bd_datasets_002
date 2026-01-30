import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'

export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([])

  function generateId(): string {
    return `PRD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  function addProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    const product: Product = {
      ...productData,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    }
    products.value.push(product)
  }

  function updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>) {
    const idx = products.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      products.value[idx] = {
        ...products.value[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      }
    }
  }

  function deleteProduct(id: string) {
    products.value = products.value.filter(p => p.id !== id)
  }

  function initialize(newProducts: Product[]) {
    products.value = newProducts
  }

  function seedIfEmpty() {
    if (products.value.length === 0) {
      const demoProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
        { name: 'Wireless Mouse', sku: 'SKU-001', category: 'Accessories', price: 29.99, stock: 50 },
        { name: 'Mechanical Keyboard', sku: 'SKU-002', category: 'Accessories', price: 99.99, stock: 30 },
        { name: 'USB-C Hub', sku: 'SKU-003', category: 'Accessories', price: 49.99, stock: 25 },
        { name: 'Webcam HD', sku: 'SKU-004', category: 'Audio', price: 79.99, stock: 15 },
        { name: 'Wireless Headphones', sku: 'SKU-005', category: 'Audio', price: 149.99, stock: 20 }
      ]
      demoProducts.forEach(product => addProduct(product))
    }
  }

  function adjustStock(id: string, amount: number): boolean {
    const product = products.value.find(p => p.id === id)
    if (!product) return false
    
    const newStock = product.stock + amount
    if (newStock < 0) return false
    
    updateProduct(id, { stock: newStock })
    return true
  }

  function statusByStock(stock: number): StockStatus {
    if (stock === 0) return 'Out of Stock'
    if (stock <= 5) return 'Low Stock'
    return 'In Stock'
  }

  function importProducts(importedProducts: Product[]) {
    products.value = importedProducts
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

  const availableCategories = computed(() => categories.value)

  const totalStock = computed(() => {
    return products.value.reduce((sum, p) => sum + p.stock, 0)
  })

  return {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    initialize,
    seedIfEmpty,
    adjustStock,
    statusByStock,
    importProducts,
    totalProducts,
    totalStock,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    inStockPercentage,
    lowStockPercentage,
    outOfStockPercentage,
    categories,
    availableCategories
  }
})