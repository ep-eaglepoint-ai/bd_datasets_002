<template>
  <section class="space-y-6">
    <div>
      <p class="text-sm text-slate-500 dark:text-slate-400">Create</p>
      <h1 class="text-2xl font-semibold">Add new product</h1>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <ProductForm
        :categories="store.availableCategories"
        :reserved-skus="existingSkus"
        submit-label="Create product"
        @submit="createProduct"
        @cancel="goBack"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Product } from '~/stores/products'

const store = useProductsStore()
const router = useRouter()
const { addToast } = useToasts()

const existingSkus = computed(() => store.products.map((product) => product.sku))

const createProduct = (payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
  store.addProduct(payload)
  addToast('Product created successfully.', 'success')
  router.push('/products')
}

const goBack = () => {
  router.back()
}
</script>
