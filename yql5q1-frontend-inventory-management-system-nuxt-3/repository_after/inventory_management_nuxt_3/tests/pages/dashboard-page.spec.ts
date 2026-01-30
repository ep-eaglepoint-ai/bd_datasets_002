import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import DashboardPage from '~/pages/index.vue'
import { useProductsStore, type Product } from '~/stores/products'

const addToastSpy = vi.fn()

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({
    toasts: [],
    addToast: addToastSpy,
    removeToast: vi.fn()
  })
}))

const stubs = {
  NuxtLink: defineComponent({ template: '<a><slot /></a>' }),
  StatCard: defineComponent({ props: ['label', 'value', 'trend', 'trendClass', 'subtitle'], template: '<div class="stat">{{ label }}: {{ value }}</div>' })
}

const sample: Product[] = [
  {
    id: 'PRD-201',
    name: 'Wireless Keyboard',
    sku: 'KB-1',
    category: 'Accessories',
    price: 49.99,
    stock: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'PRD-202',
    name: 'USB Hub',
    sku: 'HUB-1',
    category: 'Accessories',
    price: 29.99,
    stock: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'PRD-203',
    name: 'Headphones',
    sku: 'AUD-1',
    category: 'Audio',
    price: 199,
    stock: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

const mountDashboard = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useProductsStore()
  store.initialize(JSON.parse(JSON.stringify(sample)))

  const wrapper = mount(DashboardPage, {
    global: {
      plugins: [pinia],
      stubs
    }
  })

  await nextTick()

  return { wrapper, store }
}

describe('Dashboard page', () => {
  beforeEach(() => {
    addToastSpy.mockClear()
  })

  it('summarizes totals and status breakdowns', async () => {
    const { wrapper } = await mountDashboard()

    expect(wrapper.vm.store.totalProducts).toBe(3)
    expect(wrapper.vm.store.lowStockCount).toBe(1)
    expect(wrapper.vm.store.outOfStockCount).toBe(1)
    expect(wrapper.vm.inStockCount).toBe(1)
    expect(wrapper.vm.inStockPercentage).toBe('33%')
    expect(wrapper.vm.lowStockPercentage).toBe('33%')
    expect(wrapper.vm.outOfStockPercentage).toBe('33%')
  })

  it('exports data and notifies users', async () => {
    const { wrapper } = await mountDashboard()
    await wrapper.vm.exportData()
    expect(addToastSpy).toHaveBeenCalledWith('Inventory exported successfully.', 'success')
  })
})
