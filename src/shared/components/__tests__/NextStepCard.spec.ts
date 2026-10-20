import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import NextStepCard from '@/shared/components/NextStepCard.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/nodes/:nodeId', name: 'node', component: { template: '<div />' } }],
})

function mountCard() {
  return mount(NextStepCard, {
    props: {
      eyebrow: 'Up next · step 8 of 14',
      title: 'The G chord',
      kind: 'video',
      kindLabel: 'Video',
      actionLabel: 'Start lesson',
      to: { name: 'node', params: { nodeId: 'n-8' } },
    },
    global: { plugins: [router] },
  })
}

describe('NextStepCard', () => {
  it('shows the eyebrow, the title and the kind', () => {
    const wrapper = mountCard()

    expect(wrapper.get('[data-test="next-step-eyebrow"]').text()).toBe('Up next · step 8 of 14')
    expect(wrapper.get('h2').text()).toBe('The G chord')
    expect(wrapper.text()).toContain('Video')
  })

  it('has one action that opens the step', () => {
    const wrapper = mountCard()

    const action = wrapper.get('[data-test="next-step-action"]')
    expect(action.text()).toBe('Start lesson')
    expect(action.attributes('href')).toBe('/nodes/n-8')
  })
})
