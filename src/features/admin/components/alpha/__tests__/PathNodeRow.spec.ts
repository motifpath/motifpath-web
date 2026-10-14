import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PathNodeRow from '@/features/admin/components/alpha/PathNodeRow.vue'
import { makeAlphaPathNode } from '@/shared/testUtils/alphaObservation'

describe('PathNodeRow', () => {
  it('shows a completed node with when it was completed', () => {
    const wrapper = mount(PathNodeRow, { props: { node: makeAlphaPathNode() } })

    expect(wrapper.text()).toContain('Holding the guitar')
    expect(wrapper.get('[data-test="node-date"]').text()).toBe('22 Sep')
    expect(wrapper.attributes('data-status')).toBe('completed')
  })

  it('shows the node in progress with when it started', () => {
    const node = makeAlphaPathNode({ status: 'in_progress', completed_at: null, started_at: '2026-10-14T10:00:00Z' })
    const wrapper = mount(PathNodeRow, { props: { node } })

    expect(wrapper.get('[data-test="node-date"]').text()).toBe('Started 14 Oct')
  })

  it('shows no date for a node not started', () => {
    const node = makeAlphaPathNode({ status: 'not_started', completed_at: null, started_at: null })
    const wrapper = mount(PathNodeRow, { props: { node } })

    expect(wrapper.find('[data-test="node-date"]').exists()).toBe(false)
  })

  it('names its status for a screen reader, so the icon is not the only cue', () => {
    const wrapper = mount(PathNodeRow, { props: { node: makeAlphaPathNode() } })

    expect(wrapper.get('[data-test="node-status"]').text()).toBe('Completed')
  })
})
