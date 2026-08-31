import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import HomeView from '@/features/student/views/HomeView.vue'

describe('HomeView', () => {
  it('renders the app name', () => {
    const wrapper = mount(HomeView)

    expect(wrapper.get('h1').text()).toBe('MotifPath')
  })
})
