import { watch } from 'vue'
import type { Product } from '~/stores/products'
import { useProductsStore } from '~/stores/products'

const STORAGE_KEY = 'ims_products'

export default defineNuxtPlugin(() => {
  const store = useProductsStore()

  if (process.client) {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Product[]
        store.initialize(parsed)
      } catch {
        store.seedIfEmpty()
      }
    } else {
      store.seedIfEmpty()
    }

    watch(
      () => store.products,
      (value) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      },
      { deep: true }
    )
  }
})
