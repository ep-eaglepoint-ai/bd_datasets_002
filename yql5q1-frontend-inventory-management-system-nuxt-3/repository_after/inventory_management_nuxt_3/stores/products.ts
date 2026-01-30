import { defineStore } from 'pinia'

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'

export interface Product {
  id: string
  name: string
  sku: string
  category: string
  price: number
  stock: number
  createdAt: string
  updatedAt: string
}

const LOW_STOCK_THRESHOLD = 10

const seedProducts: Product[] = [
  {
    id: 'PRD-1001',
    name: 'Wireless Keyboard',
    sku: 'KB-WL-439',
    category: 'Accessories',
    price: 49.99,
    stock: 24,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'PRD-1002',
    name: 'USB-C Hub',
    sku: 'HUB-UC-118',
    category: 'Accessories',
    price: 29.5,
    stock: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'PRD-1003',
    name: 'Noise Cancelling Headphones',
    sku: 'AUD-NC-600',
    category: 'Audio',
    price: 199,
    stock: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export const useProductsStore = defineStore('products', {
  state: () => ({
    products: [] as Product[],
    categories: ['Accessories', 'Audio', 'Computers', 'Office', 'Storage']
  }),
  getters: {
    totalProducts: (state) => state.products.length,
    totalStock: (state) => state.products.reduce((sum, product) => sum + product.stock, 0),
    lowStockCount: (state) => state.products.filter((product) => product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD).length,
    outOfStockCount: (state) => state.products.filter((product) => product.stock === 0).length,
    statusByStock: () => (stock: number): StockStatus => {
      if (stock === 0) return 'Out of Stock'
      if (stock <= LOW_STOCK_THRESHOLD) return 'Low Stock'
      return 'In Stock'
    },
    availableCategories: (state) => {
      const unique = new Set(state.categories)
      state.products.forEach((product) => unique.add(product.category))
      return Array.from(unique).sort()
    }
  },
  actions: {
    initialize(products: Product[]) {
      this.products = products
    },
    seedIfEmpty() {
      if (this.products.length === 0) {
        this.products = seedProducts
      }
    },
    addProduct(payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
      const now = new Date().toISOString()
      const id = `PRD-${Math.floor(1000 + Math.random() * 9000)}`
      this.products.unshift({
        ...payload,
        id,
        createdAt: now,
        updatedAt: now
      })
    },
    updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>)
    {
      const index = this.products.findIndex((product) => product.id === id)
      if (index === -1) return
      this.products[index] = {
        ...this.products[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
    },
    deleteProduct(id: string) {
      this.products = this.products.filter((product) => product.id !== id)
    },
    adjustStock(id: string, delta: number) {
      const product = this.products.find((item) => item.id === id)
      if (!product) return false
      const nextStock = product.stock + delta
      if (nextStock < 0) return false
      product.stock = nextStock
      product.updatedAt = new Date().toISOString()
      return true
    },
    importProducts(products: Product[]) {
      this.products = products
    }
  }
})
