<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <div class="grid gap-4 md:grid-cols-2">
      <div>
        <label class="text-xs font-semibold uppercase text-slate-500">Product name</label>
        <input
          v-model.trim="form.name"
          type="text"
          class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950"
          placeholder="Wireless Mouse"
        />
        <p v-if="errors.name" class="mt-1 text-xs text-rose-500">{{ errors.name }}</p>
      </div>
      <div>
        <label class="text-xs font-semibold uppercase text-slate-500">SKU</label>
        <input
          v-model.trim="form.sku"
          type="text"
          class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950"
          placeholder="SKU-204"
        />
        <p v-if="errors.sku" class="mt-1 text-xs text-rose-500">{{ errors.sku }}</p>
      </div>
      <div>
        <label class="text-xs font-semibold uppercase text-slate-500">Category</label>
        <input
          v-model.trim="form.category"
          type="text"
          class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950"
          placeholder="Accessories"
          list="category-list"
        />
        <datalist id="category-list">
          <option v-for="category in categories" :key="category" :value="category" />
        </datalist>
        <p v-if="errors.category" class="mt-1 text-xs text-rose-500">{{ errors.category }}</p>
      </div>
      <div>
        <label class="text-xs font-semibold uppercase text-slate-500">Price</label>
        <input
          v-model.number="form.price"
          type="number"
          min="0"
          step="0.01"
          class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950"
          placeholder="0.00"
        />
        <p v-if="errors.price" class="mt-1 text-xs text-rose-500">{{ errors.price }}</p>
      </div>
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <div>
        <label class="text-xs font-semibold uppercase text-slate-500">Stock quantity</label>
        <input
          v-model.number="form.stock"
          type="number"
          min="0"
          step="1"
          class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950"
        />
        <p v-if="errors.stock" class="mt-1 text-xs text-rose-500">{{ errors.stock }}</p>
      </div>
      <div>
        <label class="text-xs font-semibold uppercase text-slate-500">Status</label>
        <div class="mt-2">
          <StatusBadge :status="status" />
        </div>
        <p class="mt-1 text-xs text-slate-500">Auto-calculated based on stock.</p>
      </div>
    </div>
    <div class="flex flex-wrap justify-end gap-3">
      <button
        type="button"
        class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
        @click="$emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        {{ submitLabel }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { Product, StockStatus } from '~/stores/products'

const props = defineProps<{
  initialProduct?: Product | null
  submitLabel: string
  categories: string[]
  reservedSkus: string[]
}>()

defineEmits<{ (e: 'submit', payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): void; (e: 'cancel'): void }>()

const store = useProductsStore()

const form = reactive({
  name: props.initialProduct?.name ?? '',
  sku: props.initialProduct?.sku ?? '',
  category: props.initialProduct?.category ?? '',
  price: props.initialProduct?.price ?? 0,
  stock: props.initialProduct?.stock ?? 0
})

watch(
  () => props.initialProduct,
  (product) => {
    if (!product) return
    form.name = product.name
    form.sku = product.sku
    form.category = product.category
    form.price = product.price
    form.stock = product.stock
  }
)

const errors = reactive<{ name?: string; sku?: string; category?: string; price?: string; stock?: string }>({})

const status = computed<StockStatus>(() => store.statusByStock(form.stock))

const validate = () => {
  errors.name = !form.name ? 'Name is required.' : undefined
  errors.sku = !form.sku ? 'SKU is required.' : undefined
  errors.category = !form.category ? 'Category is required.' : undefined
  errors.price = form.price < 0 ? 'Price must be 0 or higher.' : undefined
  errors.stock = form.stock < 0 ? 'Stock cannot be negative.' : undefined

  if (form.sku && props.reservedSkus.includes(form.sku)) {
    errors.sku = 'SKU already exists.'
  }

  return !errors.name && !errors.sku && !errors.category && !errors.price && !errors.stock
}

const handleSubmit = () => {
  if (!validate()) return
  emit('submit', {
    name: form.name,
    sku: form.sku,
    category: form.category,
    price: Number(form.price),
    stock: Number(form.stock)
  })
}
</script>
