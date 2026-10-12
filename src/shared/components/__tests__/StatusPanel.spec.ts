import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import StatusPanel from '@/shared/components/StatusPanel.vue'

describe('StatusPanel', () => {
  it('says the status and what learners get now', () => {
    const wrapper = mount(StatusPanel, {
      props: { status: { label: 'Published · v3', tone: 'success' }, message: 'Learners get version 3.' },
    })

    expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Published · v3')
    expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe('Learners get version 3.')
  })

  it('offers the one publishing action and emits it', async () => {
    const wrapper = mount(StatusPanel, {
      props: { status: { label: 'Unpublished changes', tone: 'warning' }, message: 'Learners still get version 3.', primary: 'Publish changes' },
    })

    const primary = wrapper.get('[data-test="status-panel-primary"]')
    expect(primary.text()).toBe('Publish changes')
    await primary.trigger('click')
    expect(wrapper.emitted('primary')).toHaveLength(1)
  })

  it('offers a quieter second action and emits it', async () => {
    const wrapper = mount(StatusPanel, {
      props: { status: { label: 'Published · v3', tone: 'success' }, message: 'Learners get version 3.', secondary: 'Unpublish' },
    })

    await wrapper.get('[data-test="status-panel-secondary"]').trigger('click')
    expect(wrapper.emitted('secondary')).toHaveLength(1)
  })

  it('lists what a publish still needs, and the action then cannot be used', async () => {
    const wrapper = mount(StatusPanel, {
      props: {
        status: { label: 'Draft', tone: 'accent' },
        message: "Not published yet — learners can't find it.",
        missing: ['A summary', 'A language'],
        primary: 'Publish',
      },
    })

    expect(wrapper.get('[data-test="status-panel-missing"]').text()).toContain('Before you publish, add:')
    expect(wrapper.findAll('[data-test="status-panel-missing-item"]').map((item) => item.text())).toEqual(['A summary', 'A language'])
    const primary = wrapper.get('[data-test="status-panel-primary"]')
    expect(primary.attributes('disabled')).toBeDefined()
    await primary.trigger('click')
    expect(wrapper.emitted('primary')).toBeUndefined()
  })

  it('shows no action when there is none, as for a teacher on a course', () => {
    const wrapper = mount(StatusPanel, {
      props: {
        status: { label: 'Unpublished changes', tone: 'warning' },
        message: 'Learners still get version 3. An admin publishes courses — your saved changes reach learners when they do.',
      },
    })

    expect(wrapper.find('[data-test="status-panel-primary"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="status-panel-secondary"]').exists()).toBe(false)
  })

  it('cannot act twice while an action runs', async () => {
    const wrapper = mount(StatusPanel, {
      props: { status: { label: 'Draft', tone: 'accent' }, message: 'x', primary: 'Publish', secondary: 'Delete', busy: true },
    })

    expect(wrapper.get('[data-test="status-panel-primary"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="status-panel-secondary"]').attributes('disabled')).toBeDefined()
  })

  it('keeps extra content, such as the way to see what learners see', () => {
    const wrapper = mount(StatusPanel, {
      props: { status: { label: 'Draft', tone: 'accent' }, message: 'x' },
      slots: { default: '<button data-test="see">See what learners see</button>' },
    })

    expect(wrapper.find('[data-test="see"]').exists()).toBe(true)
  })
})
