<template>
  <section class="space-y-6">
    <div>
      <p class="text-sm text-slate-500 dark:text-slate-400">Update</p>
      <h1 class="text-2xl font-semibold">Edit product</h1>
    </div>

    <div v-if="product" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <ProductForm
        :initial-product="product"
        :categories="store.availableCategories"
        :reserved-skus="reservedSkus"
        submit-label="Save changes"
        @submit="updateProduct"
        @cancel="goBack"
      />
    </div>

    <div v-else class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
      <p class="font-semibold">Product not found.</p>
      <p class="mt-1">It may have been deleted or the link is incorrect.</p>
      <NuxtLink to="/products" class="mt-4 inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700">
        Back to products
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Product } from '~/stores/products'

const store = useProductsStore()
const route = useRoute()
const router = useRouter()
const { addToast } = useToasts()

const product = computed(() => store.products.find((item) => item.id === route.params.id))

const reservedSkus = computed(() =>
  store.products
    .filter((item) => item.id !== route.params.id)
    .map((item) => item.sku)
)

const updateProduct = (payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!product.value) return
  store.updateProduct(product.value.id, payload)
  addToast('Product updated successfully.', 'success')
  router.push('/products')
}

const goBack = () => {
  router.back()
}
</script>
