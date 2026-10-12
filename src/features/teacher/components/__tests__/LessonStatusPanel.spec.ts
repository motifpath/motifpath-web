import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import LessonStatusPanel from '@/features/teacher/components/LessonStatusPanel.vue'

interface PanelProps {
  latestPublishedVersion?: number | null
  hasUnpublishedChanges?: boolean
  hasUnsavedChanges?: boolean
  canPublish?: boolean
  busy?: boolean
  missing?: string[]
}

function mountPanel(props: PanelProps = {}) {
  return mount(LessonStatusPanel, {
    props: { latestPublishedVersion: null, hasUnpublishedChanges: true, canPublish: true, busy: false, ...props },
  })
}

describe('LessonStatusPanel', () => {
  it('a lesson never published is a draft its author publishes', async () => {
    const wrapper = mountPanel()

    expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Draft')
    expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe("Not published yet — learners can't find it.")
    expect(wrapper.get('[data-test="status-panel-primary"]').text()).toBe('Publish')
  })

  it('publishes after a confirmation that saves first', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-test="status-panel-primary"]').trigger('click')
    expect(wrapper.text()).toContain('Publish this lesson?')
    expect(wrapper.text()).toContain('Your changes are saved first')
    expect(wrapper.emitted('publish')).toBeUndefined()

    await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')
    expect(wrapper.emitted('publish')).toHaveLength(1)
  })

  it('a published lesson says which version learners get, with nothing to publish', () => {
    const wrapper = mountPanel({ latestPublishedVersion: 2, hasUnpublishedChanges: false })

    expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Published · v2')
    expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe('Learners get version 2.')
    expect(wrapper.find('[data-test="status-panel-primary"]').exists()).toBe(false)
  })

  it('saved edits after a publish are unpublished changes', () => {
    const wrapper = mountPanel({ latestPublishedVersion: 2, hasUnpublishedChanges: true })

    expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Unpublished changes')
    expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe(
      'Learners still get version 2. Publish to give them your changes.',
    )
    expect(wrapper.get('[data-test="status-panel-primary"]').text()).toBe('Publish changes')
  })

  it('edits not saved yet can be published, since publishing saves first', () => {
    const wrapper = mountPanel({ latestPublishedVersion: 2, hasUnpublishedChanges: false, hasUnsavedChanges: true })

    expect(wrapper.get('[data-test="status-panel-primary"]').text()).toBe('Publish changes')
  })

  it('lists what a publish still needs', () => {
    const wrapper = mountPanel({ missing: ['Add a skill'] })

    expect(wrapper.findAll('[data-test="status-panel-missing-item"]').map((item) => item.text())).toEqual(['Add a skill'])
    expect(wrapper.get('[data-test="status-panel-primary"]').attributes('disabled')).toBeDefined()
  })

  it('offers no Publish to someone who may not publish this lesson, and says who does', () => {
    const wrapper = mountPanel({ canPublish: false })

    expect(wrapper.find('[data-test="status-panel-primary"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe(
      "Not published yet — learners can't find it. Its author or an admin publishes it.",
    )
  })
})
