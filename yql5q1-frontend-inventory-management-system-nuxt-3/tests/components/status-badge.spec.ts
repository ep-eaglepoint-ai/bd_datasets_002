import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from '~/components/StatusBadge.vue'

describe('StatusBadge', () => {
  const getClass = (status: 'In Stock' | 'Low Stock' | 'Out of Stock') =>
    mount(StatusBadge, { props: { status } }).classes()

  it('applies semantic colors per status', () => {
    expect(getClass('In Stock')).toContain('bg-emerald-100')
    expect(getClass('Low Stock')).toContain('bg-amber-100')
    expect(getClass('Out of Stock')).toContain('bg-rose-100')
  })
})
