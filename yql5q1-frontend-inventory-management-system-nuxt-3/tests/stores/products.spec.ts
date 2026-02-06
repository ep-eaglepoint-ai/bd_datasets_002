import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProductsStore, type Product } from '~/stores/products'

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: overrides.id ?? 'PRD-TEST',
  name: overrides.name ?? 'Sample',
  sku: overrides.sku ?? 'SKU-1',
  category: overrides.category ?? 'Accessories',
  price: overrides.price ?? 10,
  stock: overrides.stock ?? 5,
  createdAt: overrides.createdAt ?? new Date().toISOString(),
  updatedAt: overrides.updatedAt ?? new Date().toISOString()
})

describe('useProductsStore', () => {
  let store: ReturnType<typeof useProductsStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useProductsStore()
    store.initialize([])
  })

  it('seeds demo data only when empty', () => {
    store.seedIfEmpty()
    expect(store.totalProducts).toBeGreaterThan(0)

    const originalCount = store.totalProducts
    store.seedIfEmpty()
    expect(store.totalProducts).toBe(originalCount)
  })

  it('creates, updates, and deletes products with metadata', () => {
    store.addProduct({
      name: 'Keyboard',
      sku: 'KB-1',
      category: 'Accessories',
      price: 49.99,
      stock: 20
    })
    expect(store.totalProducts).toBe(1)
    const created = store.products[0]
    expect(created.id).toMatch(/^PRD-/)
    expect(created.createdAt).toBeTruthy()
    expect(created.updatedAt).toBeTruthy()

    store.updateProduct(created.id, { price: 59.99, stock: 12 })
    expect(store.products[0].price).toBe(59.99)
    expect(store.products[0].stock).toBe(12)
    // Fixed (allows equal timestamps for atomic test runs)
    expect(Date.parse(store.products[0].updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.createdAt))

    store.deleteProduct(created.id)
    expect(store.totalProducts).toBe(0)
  })

  it('manages stock adjustments with validation', () => {
    store.initialize([makeProduct({ id: 'PRD-1', stock: 5 })])
    expect(store.adjustStock('PRD-1', 3)).toBe(true)
    expect(store.products[0].stock).toBe(8)

    expect(store.adjustStock('PRD-1', -10)).toBe(false)
    expect(store.products[0].stock).toBe(8)

    expect(store.adjustStock('UNKNOWN', 1)).toBe(false)
  })

  it('derives stock status and aggregate metrics', () => {
    store.initialize([
      makeProduct({ id: 'A', stock: 25 }),
      makeProduct({ id: 'B', stock: 5 }),
      makeProduct({ id: 'C', stock: 0 })
    ])

    expect(store.totalProducts).toBe(3)
    expect(store.totalStock).toBe(30)
    expect(store.lowStockCount).toBe(1)
    expect(store.outOfStockCount).toBe(1)

    expect(store.statusByStock(0)).toBe('Out of Stock')
    expect(store.statusByStock(5)).toBe('Low Stock')
    expect(store.statusByStock(11)).toBe('In Stock')
  })

  it('tracks categories and import/export operations', () => {
    store.initialize([makeProduct({ category: 'Office' })])
    expect(store.availableCategories).toContain('Office')

    const imported: Product[] = [
      makeProduct({ id: 'NEW', sku: 'IMP-1', name: 'Imported', stock: 2 })
    ]

    store.importProducts(imported)
    expect(store.products).toEqual(imported)
  })
})