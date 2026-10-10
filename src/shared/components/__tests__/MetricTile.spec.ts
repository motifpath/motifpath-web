import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import MetricTile from '@/shared/components/MetricTile.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div />' } },
    { path: '/progress', name: 'your-progress', component: { template: '<div />' } },
  ],
})

describe('MetricTile', () => {
  it('shows the label, the number and the caption', () => {
    const wrapper = mount(MetricTile, { props: { label: 'Minutes', value: 48, caption: '+15 vs last wk' } })

    expect(wrapper.get('[data-test="metric-label"]').text()).toBe('Minutes')
    expect(wrapper.get('[data-test="metric-value"]').text()).toBe('48')
    expect(wrapper.get('[data-test="metric-caption"]').text()).toBe('+15 vs last wk')
  })

  it('leaves the caption out when there is none', () => {
    const wrapper = mount(MetricTile, { props: { label: 'Songs', value: 0 } })

    expect(wrapper.find('[data-test="metric-caption"]').exists()).toBe(false)
  })

  it('shows a positive caption in the success colour and any other in a neutral one', () => {
    const positive = mount(MetricTile, { props: { label: 'Minutes', value: 48, caption: '+15', captionTone: 'positive' } })
    const neutral = mount(MetricTile, { props: { label: 'Minutes', value: 20, caption: '−25' } })

    expect(positive.get('[data-test="metric-caption"]').classes()).toContain('text-success')
    expect(neutral.get('[data-test="metric-caption"]').classes()).toContain('text-ink-muted')
  })

  it('is a link when it has somewhere to go', async () => {
    const wrapper = mount(MetricTile, {
      props: { label: 'Minutes', value: 48, to: { name: 'your-progress' } },
      global: { plugins: [router] },
    })

    expect(wrapper.get('a').attributes('href')).toBe('/progress')
    expect(wrapper.get('a').text()).toContain('Minutes')
  })

  it('is not interactive without a destination', () => {
    const wrapper = mount(MetricTile, { props: { label: 'Minutes', value: 48 } })

    expect(wrapper.find('a').exists()).toBe(false)
  })
})
