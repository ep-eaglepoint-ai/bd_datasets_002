import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import ProductsPage from '~/pages/products/index.vue'
import { useProductsStore, type Product } from '~/stores/products'

const addToastSpy = vi.fn()
const confirmSpy = vi.fn(() => Promise.resolve(true))

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({
    toasts: ref([]),
    addToast: addToastSpy,
    removeToast: vi.fn()
  })
}))

vi.mock('~/composables/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    isOpen: ref(false),
    title: ref(''),
    message: ref(''),
    confirm: confirmSpy,
    handleConfirm: vi.fn(),
    handleCancel: vi.fn()
  })
}))

const stubs = {
  NuxtLink: defineComponent({ template: '<a><slot /></a>' }),
  ModalBase: defineComponent({ props: ['open', 'title'], template: '<div><slot /></div>' }),
  ProductForm: defineComponent({ template: '<form><slot /></form>', props: ['initialProduct', 'categories', 'reservedSkus', 'submitLabel'] }),
  StatusBadge: defineComponent({ props: ['status'], template: '<span>{{ status }}</span>' }),
  PaginationControl: defineComponent({ props: ['currentPage', 'totalPages'], emits: ['change'], template: '<div></div>' })
}

const buildProduct = (index: number, overrides: Partial<Product> = {}): Product => ({
  id: `PRD-${index}`,
  name: overrides.name ?? (index % 2 === 0 ? 'Alpha' : 'Bravo') + ` Item ${index}`,
  sku: overrides.sku ?? `SKU-${index}`,
  category: overrides.category ?? (index % 2 === 0 ? 'Accessories' : 'Audio'),
  price: overrides.price ?? 10 * index,
  stock: overrides.stock ?? (index === 0 ? 0 : index % 3 === 0 ? 5 : 25),
  createdAt: overrides.createdAt ?? new Date().toISOString(),
  updatedAt: overrides.updatedAt ?? new Date().toISOString()
})

const sampleProducts: Product[] = Array.from({ length: 10 }, (_, idx) => buildProduct(idx + 1))

const mountPage = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useProductsStore()
  store.initialize(JSON.parse(JSON.stringify(sampleProducts)))

  const wrapper = mount(ProductsPage, {
    global: {
      plugins: [pinia],
      stubs
    }
  })

  await nextTick()

  return { wrapper, store }
}

describe('Products page logic', () => {
  beforeEach(() => {
    addToastSpy.mockClear()
    confirmSpy.mockClear()
  })

  it('filters by search, category, and status while sorting results', async () => {
    const { wrapper } = await mountPage()

    wrapper.vm.search = 'Alpha'
    await nextTick()
    expect(wrapper.vm.filteredProducts.every((p: Product) => p.name.includes('Alpha'))).toBe(true)

    wrapper.vm.search = ''
    wrapper.vm.category = 'Audio'
    await nextTick()
    expect(wrapper.vm.filteredProducts.every((p: Product) => p.category === 'Audio')).toBe(true)

    wrapper.vm.status = 'Out of Stock'
    await nextTick()
    expect(wrapper.vm.filteredProducts.every((p: Product) => p.stock === 0)).toBe(true)

    wrapper.vm.status = ''
    wrapper.vm.sortKey = 'stock'
    await nextTick()
    const stocks = wrapper.vm.filteredProducts.map((p: Product) => p.stock)
    const sorted = [...stocks].sort((a, b) => b - a)
    expect(stocks).toEqual(sorted)
  })

  it('paginates results', async () => {
    const { wrapper } = await mountPage()
    wrapper.vm.currentPage = 2
    await nextTick()
    expect(wrapper.vm.paginatedProducts.length).toBe(2)
  })

  it('prevents negative stock adjustments and emits success otherwise', async () => {
    const { wrapper, store } = await mountPage()
    const target = store.products[0]

    wrapper.vm.adjustStock(target.id, -999)
    expect(addToastSpy).toHaveBeenCalledWith('Stock cannot go below zero.', 'error')

    addToastSpy.mockClear()
    wrapper.vm.adjustStock(target.id, 1)
    expect(addToastSpy).toHaveBeenCalledWith('Stock updated.', 'success')
  })

  it('confirms deletions before mutating state', async () => {
    const { wrapper, store } = await mountPage()
    const firstProduct = store.products[0]

    await wrapper.vm.confirmDelete(firstProduct)
    expect(confirmSpy).toHaveBeenCalled()
    expect(store.products.find((item) => item.id === firstProduct.id)).toBeUndefined()
    expect(addToastSpy).toHaveBeenCalledWith('Product deleted.', 'success')
  })

  it('handles JSON import success and failure paths', async () => {
    const { wrapper, store } = await mountPage()

    const invalidEvent = {
      target: {
        files: [
          {
            async text() {
              return '{"invalid": true}'
            }
          }
        ],
        value: ''
      }
    } as unknown as Event

    await wrapper.vm.handleImport(invalidEvent)
    expect(addToastSpy).toHaveBeenCalledWith('Invalid JSON file.', 'error')

    addToastSpy.mockClear()
    const validProducts: Product[] = [buildProduct(99, { name: 'Imported', stock: 3 })]
    const validEvent = {
      target: {
        files: [
          {
            async text() {
              return JSON.stringify(validProducts)
            }
          }
        ],
        value: ''
      }
    } as unknown as Event

    await wrapper.vm.handleImport(validEvent)
    expect(store.products).toEqual(validProducts)
    expect(addToastSpy).toHaveBeenCalledWith('Inventory imported successfully.', 'success')
  })
})
