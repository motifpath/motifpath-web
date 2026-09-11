import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PathStep from '@/features/student/components/PathStep.vue'

type Status = 'completed' | 'in_progress' | 'not_started' | 'locked'

function mountStep(props: Partial<{ status: Status; isCurrent: boolean }> = {}) {
  return mount(PathStep, {
    props: {
      position: 2,
      title: 'Minor pentatonic shape 1',
      status: 'not_started' as Status,
      contentNodeId: 'node-abc',
      isCurrent: false,
      ...props,
    },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('PathStep', () => {
  it('renders the ordinal and title', () => {
    const wrapper = mountStep()

    expect(wrapper.find('[data-test="step-position"]').text()).toBe('2')
    expect(wrapper.text()).toContain('Minor pentatonic shape 1')
  })

  it('shows a completed step with a Review affordance to the node route', () => {
    const wrapper = mountStep({ status: 'completed' })

    expect(wrapper.find('[data-test="step-status"]').text()).toBe('Completed')

    const link = wrapper.getComponent(RouterLinkStub)
    expect(link.text()).toBe('Review')
    expect(link.props('to')).toEqual({ name: 'node', params: { nodeId: 'node-abc' } })
  })

  it('emphasises the current step and offers an Open affordance to the node route', () => {
    const wrapper = mountStep({ status: 'in_progress', isCurrent: true })

    expect(wrapper.get('[data-test="path-step"]').classes()).toContain('font-medium')

    const link = wrapper.getComponent(RouterLinkStub)
    expect(link.text()).toBe('Open')
    expect(link.props('to')).toEqual({ name: 'node', params: { nodeId: 'node-abc' } })
  })

  it('dims a locked step, marks it aria-disabled and offers no affordance', () => {
    const wrapper = mountStep({ status: 'locked' })

    const step = wrapper.get('[data-test="path-step"]')
    expect(step.classes()).toContain('text-ink-subtle')
    expect(step.attributes('aria-disabled')).toBe('true')
    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false)
    expect(wrapper.find('[data-test="step-affordance"]').exists()).toBe(false)
  })

  it('offers no affordance for a not-yet-reached step that is not the current one', () => {
    const wrapper = mountStep({ status: 'not_started', isCurrent: false })

    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false)
  })
})
