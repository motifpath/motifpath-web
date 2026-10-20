import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import PathCard from '@/shared/components/PathCard.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div />' } },
    { path: '/path/nodes/:nodeId', name: 'node', component: { template: '<div />' } },
  ],
})

function mountCard(props: Partial<InstanceType<typeof PathCard>['$props']> = {}) {
  return mount(PathCard, {
    props: {
      pathName: 'Guitar fundamentals',
      completed: 8,
      total: 14,
      next: { title: 'Inversions', meta: 'Up next · Video' },
      to: { name: 'node', params: { nodeId: 'n-9' } },
      ...props,
    },
    global: { plugins: [router] },
  })
}

describe('PathCard', () => {
  it('shows the path, how far along it is, and the next step', () => {
    const wrapper = mountCard()

    expect(wrapper.get('[data-test="path-card-name"]').text()).toBe('Guitar fundamentals')
    expect(wrapper.get('[data-test="path-card-count"]').text()).toBe('8 of 14')
    expect(wrapper.get('[data-test="path-card-next-title"]').text()).toBe('Inversions')
    expect(wrapper.get('[data-test="path-card-next-meta"]').text()).toBe('Up next · Video')
  })

  it('gives the progress bar the whole sentence for a screen reader', () => {
    const bar = mountCard().get('[role="progressbar"]')

    expect(bar.attributes('aria-valuenow')).toBe('8')
    expect(bar.attributes('aria-valuemax')).toBe('14')
    expect(bar.attributes('aria-label')).toBe('8 of 14 steps complete')
  })

  it('is one tap target that opens the next step, with no button of its own', () => {
    const wrapper = mountCard()

    expect(wrapper.findAll('a')).toHaveLength(1)
    expect(wrapper.get('a').attributes('href')).toBe('/path/nodes/n-9')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('leaves the next-step row out when there is no next step', () => {
    const wrapper = mountCard({ next: null })

    expect(wrapper.find('[data-test="path-card-next-title"]').exists()).toBe(false)
  })
})
