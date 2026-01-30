import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PaginationControl from '~/components/PaginationControl.vue'

describe('PaginationControl', () => {
  it('disables navigation at boundaries and emits change events', async () => {
    const wrapper = mount(PaginationControl, {
      props: { currentPage: 1, totalPages: 3 }
    })

    expect(wrapper.find('button:disabled').text()).toBe('Prev')

    await wrapper.setProps({ currentPage: 3 })
    expect(wrapper.findAll('button')[1].attributes('disabled')).toBeDefined()

    await wrapper.setProps({ currentPage: 2 })
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('change')?.[0]).toEqual([1])
  })
})
