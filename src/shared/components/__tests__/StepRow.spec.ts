import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import StepRow from '@/shared/components/StepRow.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/nodes/:nodeId', name: 'node', component: { template: '<div />' } }],
})

function mountRow(props: Partial<InstanceType<typeof StepRow>['$props']> = {}) {
  return mount(StepRow, {
    props: { state: 'current', position: 8, title: 'The G chord', meta: 'Up next · Video', ...props },
    global: { plugins: [router] },
    attachTo: document.body,
  })
}

describe('StepRow', () => {
  it('shows the title and the meta line', () => {
    const wrapper = mountRow()

    expect(wrapper.text()).toContain('The G chord')
    expect(wrapper.get('[data-test="step-meta"]').text()).toBe('Up next · Video')
  })

  it('links to its destination when given one', () => {
    const wrapper = mountRow({ to: { name: 'node', params: { nodeId: 'n-8' } } })

    expect(wrapper.get('a').attributes('href')).toBe('/nodes/n-8')
  })

  it('is a button that reports a tap when it has no destination', async () => {
    const wrapper = mountRow({ state: 'locked', meta: 'Video' })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it.each([
    ['current', '8'],
    ['open', '8'],
    ['locked', '8'],
  ] as const)('marks a %s step with its position', (state, marker) => {
    expect(mountRow({ state }).get('[data-test="step-marker"]').text()).toBe(marker)
  })

  it.each(['done', 'language'] as const)('marks a %s step with an icon instead of its position', (state) => {
    expect(mountRow({ state }).get('[data-test="step-marker"]').text()).toBe('')
  })

  it('highlights the current step', () => {
    expect(mountRow({ state: 'current' }).get('[data-test="step-row"]').classes()).toContain('bg-accent-muted')
  })

  it('gives a language step its reason in the warning colour, never the error colour', () => {
    const wrapper = mountRow({ state: 'language', meta: 'Only in English for now' })

    expect(wrapper.get('[data-test="step-meta"]').classes()).toContain('text-warning')
    expect(wrapper.html()).not.toContain('danger')
  })

  it('shows a lock on locked and language steps, and a chevron otherwise', () => {
    expect(mountRow({ state: 'locked' }).find('[data-test="step-lock"]').exists()).toBe(true)
    expect(mountRow({ state: 'language' }).find('[data-test="step-lock"]').exists()).toBe(true)
    expect(mountRow({ state: 'done' }).find('[data-test="step-lock"]').exists()).toBe(false)
  })

  it('is announced as the current step', () => {
    expect(mountRow({ state: 'current', to: { name: 'node', params: { nodeId: 'n-8' } } }).get('a').attributes('aria-current')).toBe('step')
  })
})
