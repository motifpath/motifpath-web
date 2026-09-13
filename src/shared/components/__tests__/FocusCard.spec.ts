import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FocusCard from '@/shared/components/FocusCard.vue'

function mountCard(props: Partial<InstanceType<typeof FocusCard>['$props']> = {}) {
  return mount(FocusCard, {
    props: {
      position: 2,
      eyebrow: 'Continue',
      title: 'Your first chord: E minor',
      subtitle: 'In progress · pick up where you left off',
      ctaLabel: 'Open lesson',
      to: { name: 'node', params: { nodeId: 'node-2' } },
      ...props,
    },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('FocusCard', () => {
  it('renders the eyebrow, title, and subtitle', () => {
    const wrapper = mountCard()

    expect(wrapper.text()).toContain('Continue')
    expect(wrapper.text()).toContain('Your first chord: E minor')
    expect(wrapper.text()).toContain('In progress · pick up where you left off')
  })

  it('renders a CTA linking to the given route', () => {
    const wrapper = mountCard()

    const link = wrapper.getComponent(RouterLinkStub)
    expect(link.text()).toBe('Open lesson')
    expect(link.props('to')).toEqual({ name: 'node', params: { nodeId: 'node-2' } })
  })

  it('carries the step position for a11y/ordering, visually hidden', () => {
    const wrapper = mountCard({ position: 5 })

    const position = wrapper.get('[data-test="step-position"]')
    expect(position.text()).toBe('5')
    expect(position.classes()).toContain('sr-only')
  })
})
