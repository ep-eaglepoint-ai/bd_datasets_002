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

interface State {
  products: Product[]
}

export const useProductsStore = defineStore('products', {
  state: (): State => ({
    products: []
  }),
  actions: {
    initialize(data: Product[]) {
      this.products = data
    }
  },
  getters: {
    totalProducts: (state) => state.products.length,
    lowStockCount: (state) => state.products.filter(p => p.stock > 0 && p.stock < 10).length,
    outOfStockCount: (state) => state.products.filter(p => p.stock === 0).length,
    inStockCount: (state) => state.products.filter(p => p.stock >= 10).length,
    inStockPercentage(): string {
      return this.totalProducts ? Math.round((this.inStockCount / this.totalProducts) * 100) + '%' : '0%'
    },
    lowStockPercentage(): string {
      return this.totalProducts ? Math.round((this.lowStockCount / this.totalProducts) * 100) + '%' : '0%'
    },
    outOfStockPercentage(): string {
      return this.totalProducts ? Math.round((this.outOfStockCount / this.totalProducts) * 100) + '%' : '0%'
    }
  }
})