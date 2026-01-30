<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">Products</p>
        <h1 class="text-2xl font-semibold">Product catalog</h1>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-300 dark:border-slate-700 dark:text-slate-200"
          @click="openAddModal"
        >
          Add product (modal)
        </button>
        <NuxtLink
          to="/products/add"
          class="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
        >
          Add product page
        </NuxtLink>
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-300 dark:border-slate-700 dark:text-slate-200"
          @click="triggerImport"
        >
          Import JSON
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-300 dark:border-slate-700 dark:text-slate-200"
          @click="exportData"
        >
          Export JSON
        </button>
        <input ref="importInput" type="file" accept="application/json" class="hidden" @change="handleImport" />
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1.2fr,1fr,1fr,1fr]">
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <label class="text-xs font-semibold uppercase text-slate-500">Search</label>
        <input
          v-model.trim="search"
          type="text"
          placeholder="Search name or SKU"
          class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950"
        />
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <label class="text-xs font-semibold uppercase text-slate-500">Category</label>
        <select
          v-model="category"
          class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="">All categories</option>
          <option v-for="option in store.availableCategories" :key="option" :value="option">{{ option }}</option>
        </select>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <label class="text-xs font-semibold uppercase text-slate-500">Stock status</label>
        <select
          v-model="status"
          class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="">All status</option>
          <option v-for="option in statusOptions" :key="option" :value="option">{{ option }}</option>
        </select>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <label class="text-xs font-semibold uppercase text-slate-500">Sort by</label>
        <select
          v-model="sortKey"
          class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="name">Name</option>
          <option value="stock">Stock</option>
          <option value="price">Price</option>
        </select>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            <tr>
              <th class="px-6 py-3">Product</th>
              <th class="px-6 py-3">Category</th>
              <th class="px-6 py-3">Price</th>
              <th class="px-6 py-3">Stock</th>
              <th class="px-6 py-3">Status</th>
              <th class="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in paginatedProducts" :key="product.id" class="border-b border-slate-200 last:border-0 dark:border-slate-800">
              <td class="px-6 py-4">
                <div class="font-semibold">{{ product.name }}</div>
                <div class="text-xs text-slate-500">{{ product.sku }} • {{ product.id }}</div>
              </td>
              <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{{ product.category }}</td>
              <td class="px-6 py-4 text-sm">{{ formatCurrency(product.price) }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-300 dark:border-slate-700 dark:text-slate-200"
                    @click="adjustStock(product.id, -1)"
                  >
                    -
                  </button>
                  <span class="min-w-[2rem] text-center text-sm font-semibold">{{ product.stock }}</span>
                  <button
                    type="button"
                    class="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-300 dark:border-slate-700 dark:text-slate-200"
                    @click="adjustStock(product.id, 1)"
                  >
                    +
                  </button>
                </div>
              </td>
              <td class="px-6 py-4">
                <StatusBadge :status="store.statusByStock(product.stock)" />
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-300 dark:border-slate-700 dark:text-slate-200"
                    @click="openEditModal(product)"
                  >
                    Edit
                  </button>
                  <NuxtLink
                    :to="`/products/${product.id}/edit`"
                    class="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-300 dark:border-slate-700 dark:text-slate-200"
                  >
                    Edit page
                  </NuxtLink>
                  <button
                    type="button"
                    class="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300"
                    @click="confirmDelete(product)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="paginatedProducts.length === 0" class="px-6 py-8 text-center text-sm text-slate-500">
        No products match your filters.
      </div>
      <div class="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
        <PaginationControl
          :current-page="currentPage"
          :total-pages="totalPages"
          @change="changePage"
        />
      </div>
    </div>

    <ModalBase :open="isAddOpen" title="Add product" @close="isAddOpen = false">
      <ProductForm
        :categories="store.availableCategories"
        :reserved-skus="existingSkus"
        submit-label="Create product"
        @submit="createProduct"
        @cancel="isAddOpen = false"
      />
    </ModalBase>

    <ModalBase :open="isEditOpen" title="Edit product" @close="isEditOpen = false">
      <ProductForm
        :initial-product="editingProduct"
        :categories="store.availableCategories"
        :reserved-skus="editReservedSkus"
        submit-label="Save changes"
        @submit="updateProduct"
        @cancel="isEditOpen = false"
      />
    </ModalBase>
  </section>
</template>

<script setup lang="ts">
import type { Product, StockStatus } from '~/stores/products'

const store = useProductsStore()
const { addToast } = useToasts()
const { confirm } = useConfirmDialog()

const search = ref('')
const category = ref('')
const status = ref<StockStatus | ''>('')
const sortKey = ref<'name' | 'stock' | 'price'>('name')
const currentPage = ref(1)
const pageSize = 8

const statusOptions: StockStatus[] = ['In Stock', 'Low Stock', 'Out of Stock']

const filteredProducts = computed(() => {
  const query = search.value.toLowerCase()
  return store.products
    .filter((product) => {
      const matchesQuery =
        !query || product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query)
      const matchesCategory = !category.value || product.category === category.value
      const matchesStatus = !status.value || store.statusByStock(product.stock) === status.value
      return matchesQuery && matchesCategory && matchesStatus
    })
    .sort((a, b) => {
      if (sortKey.value === 'name') return a.name.localeCompare(b.name)
      if (sortKey.value === 'stock') return b.stock - a.stock
      return b.price - a.price
    })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProducts.value.length / pageSize)))

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredProducts.value.slice(start, start + pageSize)
})

watch([search, category, status, sortKey], () => {
  currentPage.value = 1
})

const changePage = (page: number) => {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const isAddOpen = ref(false)
const isEditOpen = ref(false)
const editingProduct = ref<Product | null>(null)

const existingSkus = computed(() => store.products.map((product) => product.sku))
const editReservedSkus = computed(() =>
  store.products
    .filter((product) => product.id !== editingProduct.value?.id)
    .map((product) => product.sku)
)

const openAddModal = () => {
  isAddOpen.value = true
}

const openEditModal = (product: Product) => {
  editingProduct.value = product
  isEditOpen.value = true
}

const createProduct = (payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
  store.addProduct(payload)
  isAddOpen.value = false
  addToast('Product created successfully.', 'success')
}

const updateProduct = (payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!editingProduct.value) return
  store.updateProduct(editingProduct.value.id, payload)
  isEditOpen.value = false
  addToast('Product updated successfully.', 'success')
}

const confirmDelete = async (product: Product) => {
  const accepted = await confirm({
    title: 'Delete product',
    message: `Delete ${product.name}? This action cannot be undone.`
  })

  if (!accepted) return
  store.deleteProduct(product.id)
  addToast('Product deleted.', 'success')
}

const adjustStock = (id: string, delta: number) => {
  const success = store.adjustStock(id, delta)
  if (!success) {
    addToast('Stock cannot go below zero.', 'error')
    return
  }
  addToast('Stock updated.', 'success')
}

const importInput = ref<HTMLInputElement | null>(null)

const triggerImport = () => {
  importInput.value?.click()
}

const handleImport = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text) as Product[]
    if (!Array.isArray(data)) throw new Error('Invalid file')
    store.importProducts(data)
    addToast('Inventory imported successfully.', 'success')
  } catch {
    addToast('Invalid JSON file.', 'error')
  } finally {
    input.value = ''
  }
}

const exportData = () => {
  const data = JSON.stringify(store.products, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `inventory-export-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
  addToast('Inventory exported successfully.', 'success')
}
</script>
