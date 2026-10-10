import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import YourProgressView from '@/features/student/views/YourProgressView.vue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div data-test="home-page" />' } },
      { path: '/progress', name: 'your-progress', component: YourProgressView },
    ],
  })
}

describe('YourProgressView', () => {
  it('is titled Your progress', async () => {
    const router = makeRouter()
    await router.push({ name: 'your-progress' })
    const wrapper = mount(YourProgressView, { global: { plugins: [router] } })

    expect(wrapper.get('h1').text()).toBe('Your progress')
  })

  it('goes back to the home it was opened from', async () => {
    const router = makeRouter()
    await router.push({ name: 'home' })
    await router.push({ name: 'your-progress', query: { instrument: 'i-1' } })
    const wrapper = mount(YourProgressView, { global: { plugins: [router] } })

    await wrapper.get('[data-test="your-progress-back"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('goes to the home when opened directly, with nothing to go back to', async () => {
    const router = makeRouter()
    await router.push({ name: 'your-progress' })
    const wrapper = mount(YourProgressView, { global: { plugins: [router] } })

    await wrapper.get('[data-test="your-progress-back"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('home')
  })
})
