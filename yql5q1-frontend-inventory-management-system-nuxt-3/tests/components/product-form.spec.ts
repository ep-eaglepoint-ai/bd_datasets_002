import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import ProductForm from '~/components/ProductForm.vue'

const StatusBadgeStub = defineComponent<{ status: string}>({
  props: ['status'],
  template: '<span class="status">{{ status }}</span>'
})

describe('ProductForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mountForm = () =>
    mount(ProductForm, {
      props: {
        submitLabel: 'Save',
        categories: ['Accessories'],
        reservedSkus: []
      },
      global: {
        stubs: { StatusBadge: StatusBadgeStub }
      }
    })

  it('validates required fields', async () => {
    const wrapper = mountForm()
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Name is required.')
    expect(wrapper.text()).toContain('SKU is required.')
    expect(wrapper.text()).toContain('Category is required.')
  })

  it('emits submit payload when form is valid', async () => {
    const wrapper = mountForm()
    const inputs = wrapper.findAll('input')

    await inputs[0].setValue('Wireless Mouse')
    await inputs[1].setValue('SKU-204')
    await inputs[2].setValue('Accessories')
    await inputs[3].setValue('199.99')
    await inputs[4].setValue('12')

    await wrapper.find('form').trigger('submit.prevent')

    const emitted = wrapper.emitted('submit')?.[0]?.[0]
    expect(emitted).toMatchObject({
      name: 'Wireless Mouse',
      sku: 'SKU-204',
      category: 'Accessories',
      price: 199.99,
      stock: 12
    })
    expect(wrapper.text()).not.toContain('required')
  })

  it('prevents duplicate SKUs and negative values', async () => {
    const wrapper = mount(ProductForm, {
      props: {
        submitLabel: 'Save',
        categories: ['Accessories'],
        reservedSkus: ['SKU-LOCKED']
      },
      global: { stubs: { StatusBadge: StatusBadgeStub } }
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('Keyboard')
    await inputs[1].setValue('SKU-LOCKED')
    await inputs[2].setValue('Accessories')
    await inputs[3].setValue('-5')
    await inputs[4].setValue('-1')

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('SKU already exists.')
    expect(wrapper.text()).toContain('Price must be 0 or higher.')
    expect(wrapper.text()).toContain('Stock cannot be negative.')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('reflects auto-calculated status badge values', async () => {
    const wrapper = mountForm()
    const stockInput = wrapper.findAll('input')[4]

    await stockInput.setValue('0')
    expect(wrapper.find('.status').text()).toBe('Out of Stock')

    await stockInput.setValue('5')
    expect(wrapper.find('.status').text()).toBe('Low Stock')

    await stockInput.setValue('25')
    expect(wrapper.find('.status').text()).toBe('In Stock')
  })
})
