import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PathStatusPanel from '@/features/teacher/components/PathStatusPanel.vue'

interface PanelProps {
  status?: 'draft' | 'published'
  isAdmin?: boolean
  busy?: boolean
  missing?: string[]
}

function mountPanel(props: PanelProps = {}) {
  return mount(PathStatusPanel, { props: { status: 'draft', isAdmin: true, busy: false, ...props } })
}

describe('PathStatusPanel', () => {
  it('a draft says learners can’t find it yet', () => {
    const wrapper = mountPanel()

    expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Draft')
    expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe("Not published yet — learners can't find it.")
  })

  it('a published path says learners get it as saved', () => {
    const wrapper = mountPanel({ status: 'published' })

    expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Published')
    expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe(
      'In the path catalog — learners who start it get it as it is saved.',
    )
  })

  describe('for an admin', () => {
    it('publishes a draft after confirmation, saving first', async () => {
      const wrapper = mountPanel()

      await wrapper.get('[data-test="status-panel-primary"]').trigger('click')
      expect(wrapper.text()).toContain('Publish this path?')
      expect(wrapper.text()).toContain('Your changes are saved first')
      expect(wrapper.emitted('publish')).toBeUndefined()

      await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')
      expect(wrapper.emitted('publish')).toHaveLength(1)
    })

    it('lists what a publish still needs', () => {
      const wrapper = mountPanel({ missing: ['A summary', 'A language'] })

      expect(wrapper.findAll('[data-test="status-panel-missing-item"]').map((item) => item.text())).toEqual([
        'A summary',
        'A language',
      ])
      expect(wrapper.get('[data-test="status-panel-primary"]').attributes('disabled')).toBeDefined()
    })

    it('offers Unpublish on a published path', async () => {
      const wrapper = mountPanel({ status: 'published' })

      expect(wrapper.find('[data-test="status-panel-primary"]').exists()).toBe(false)
      await wrapper.get('[data-test="status-panel-secondary"]').trigger('click')
      expect(wrapper.emitted('unpublish')).toHaveLength(1)
    })
  })

  describe('for a teacher', () => {
    it('says an admin publishes paths, instead of a button', () => {
      const wrapper = mountPanel({ isAdmin: false })

      expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe(
        "Not published yet — learners can't find it. An admin publishes paths — your saved changes reach learners when they do.",
      )
      expect(wrapper.find('[data-test="status-panel-primary"]').exists()).toBe(false)
    })

    it('offers no Unpublish', () => {
      expect(mountPanel({ isAdmin: false, status: 'published' }).find('[data-test="status-panel-secondary"]').exists()).toBe(false)
    })
  })
})
