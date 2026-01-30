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

export const useProductsStore = defineStore('products', {
  state: () => ({
    products: [] as Product[]
  }),
  actions: {
    addProduct(product: Product) {
      this.products.push(product)
      // Optionally update LocalStorage here
    },
    updateProduct(updated: Product) {
      const idx = this.products.findIndex(p => p.id === updated.id)
      if (idx !== -1) this.products[idx] = updated
    },
    deleteProduct(id: string) {
      this.products = this.products.filter(p => p.id !== id)
    },
    initialize(products: Product[]) {
      this.products = products
    }
  },
  getters: {
    totalProducts: state => state.products.length,
    inStockCount: state => state.products.filter(p => p.stock > 5).length,
    lowStockCount: state => state.products.filter(p => p.stock > 0 && p.stock <= 5).length,
    outOfStockCount: state => state.products.filter(p => p.stock === 0).length,
    inStockPercentage: (state: any, getters: { totalProducts: number; inStockCount: number }) =>
      getters.totalProducts ? Math.round((getters.inStockCount / getters.totalProducts) * 100) + '%' : '0%',
    lowStockPercentage: (state: any, getters: { totalProducts: number; lowStockCount: number }) =>
      getters.totalProducts ? Math.round((getters.lowStockCount / getters.totalProducts) * 100) + '%' : '0%',
    outOfStockPercentage: (state: any, getters: { totalProducts: number; outOfStockCount: number }) =>
      getters.totalProducts ? Math.round((getters.outOfStockCount / getters.totalProducts) * 100) + '%' : '0%',
    categories: state => {
      const cats = new Set<string>();
      state.products.forEach(p => cats.add(p.category));
      return Array.from(cats);
    }
  }
});