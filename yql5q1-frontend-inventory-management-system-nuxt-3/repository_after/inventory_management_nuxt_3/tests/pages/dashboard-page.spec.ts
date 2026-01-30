import { mount } from '@vue/test-utils'
import DashboardPage from '~/pages/index.vue'
import { createPinia, setActivePinia } from 'pinia'

describe('DashboardPage', () => {
  it('renders properly', () => {
    setActivePinia(createPinia())
    const wrapper = mount(DashboardPage)
    expect(wrapper.text()).toContain('Dashboard')
  })
})