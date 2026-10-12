import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import CourseStatusPanel from '@/features/teacher/components/CourseStatusPanel.vue'

type Course = components['schemas']['Course']

function course(overrides: Partial<Course> = {}): Course {
  return {
    course_id: 'c-1',
    title: 'Guitar foundations',
    summary: 's',
    level: 'beginner',
    language: 'en',
    status: 'draft',
    created_by: { user_id: 't-1', display_name: 'Tomás' },
    created_at: '2026-09-01T00:00:00Z',
    has_unpublished_changes: false,
    instrument_ids: [],
    checkpoints: [],
    ...overrides,
  }
}

interface PanelProps {
  isAdmin?: boolean
  busy?: boolean
  hasUnsavedChanges?: boolean
  missing?: string[]
}

function mountPanel(overrides: Partial<Course> = {}, props: PanelProps = {}) {
  return mount(CourseStatusPanel, {
    props: { course: course(overrides), isAdmin: true, busy: false, ...props },
  })
}

const published = { status: 'published', latest_published_version: 3 } as const

describe('CourseStatusPanel', () => {
  describe('what learners get now', () => {
    it('a draft says learners can’t find it yet', () => {
      const wrapper = mountPanel()

      expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Draft')
      expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe("Not published yet — learners can't find it.")
    })

    it('a published course says which version learners get', () => {
      const wrapper = mountPanel(published)

      expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Published · v3')
      expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe('Learners get version 3.')
    })

    it('saved edits after a publish are unpublished changes', () => {
      const wrapper = mountPanel({ ...published, has_unpublished_changes: true })

      expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Unpublished changes')
      expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe(
        'Learners still get version 3. Publish to give them your changes.',
      )
      expect(wrapper.get('[data-test="status-panel-primary"]').text()).toBe('Publish changes')
    })

    it('a retired course says it can’t be changed', () => {
      const wrapper = mountPanel({ status: 'retired', latest_published_version: 2 }, { isAdmin: false })

      expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Retired')
      expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe(
        "Retired — it can't be changed. An admin can reactivate it.",
      )
    })
  })

  describe('for an admin', () => {
    it('publishes a draft after a confirmation that says who gets it', async () => {
      const wrapper = mountPanel()

      await wrapper.get('[data-test="status-panel-primary"]').trigger('click')
      expect(wrapper.emitted('publish')).toBeUndefined()
      expect(wrapper.text()).toContain('Publish this course?')
      expect(wrapper.text()).toContain('Your changes are saved first')
      expect(wrapper.text()).toContain('Learners who enroll from now on get this version')

      await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')
      expect(wrapper.emitted('publish')).toHaveLength(1)
    })

    it('offers no Publish when there is nothing new to publish', () => {
      const wrapper = mountPanel(published)

      expect(wrapper.find('[data-test="status-panel-primary"]').exists()).toBe(false)
    })

    it('offers Publish changes for edits not saved yet, since publishing saves first', () => {
      const wrapper = mountPanel(published, { hasUnsavedChanges: true })

      expect(wrapper.get('[data-test="status-panel-primary"]').text()).toBe('Publish changes')
    })

    it('lists what a publish still needs', () => {
      const wrapper = mountPanel({}, { missing: ['A summary', 'A language'] })

      expect(wrapper.findAll('[data-test="status-panel-missing-item"]').map((item) => item.text())).toEqual([
        'A summary',
        'A language',
      ])
      expect(wrapper.get('[data-test="status-panel-primary"]').attributes('disabled')).toBeDefined()
    })

    it('retires a published course after confirmation', async () => {
      const wrapper = mountPanel(published)

      expect(wrapper.get('[data-test="status-panel-secondary"]').text()).toBe('Retire')
      await wrapper.get('[data-test="status-panel-secondary"]').trigger('click')
      expect(wrapper.text()).toContain('Existing enrollments are unaffected')
      await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')

      expect(wrapper.emitted('retire')).toHaveLength(1)
    })

    it('asks to save before retiring', () => {
      const wrapper = mountPanel(published, { hasUnsavedChanges: true })

      expect(wrapper.find('[data-test="status-panel-secondary"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="retire-needs-save"]').text()).toBe('Save your changes before retiring the course.')
    })

    it('does not retire a draft', () => {
      expect(mountPanel().find('[data-test="status-panel-secondary"]').exists()).toBe(false)
    })

    it('reactivates a retired course after confirmation, and offers nothing else', async () => {
      const wrapper = mountPanel({ status: 'retired', latest_published_version: 2 })

      expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe(
        "Retired — it can't be changed. Reactivate it to edit it again.",
      )
      expect(wrapper.find('[data-test="status-panel-secondary"]').exists()).toBe(false)
      await wrapper.get('[data-test="status-panel-primary"]').trigger('click')
      expect(wrapper.text()).toContain('returns to the catalog with its latest published version')
      await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')

      expect(wrapper.emitted('reactivate')).toHaveLength(1)
    })

    it('drops the question when cancelled', async () => {
      const wrapper = mountPanel()

      await wrapper.get('[data-test="status-panel-primary"]').trigger('click')
      await wrapper.get('[data-test="confirm-dialog-cancel"]').trigger('click')

      expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
      expect(wrapper.emitted('publish')).toBeUndefined()
    })

    it('closes the question once the action has finished', async () => {
      const wrapper = mountPanel()
      await wrapper.get('[data-test="status-panel-primary"]').trigger('click')
      await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')
      await wrapper.setProps({ busy: true })
      expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)

      await wrapper.setProps({ busy: false })

      expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    })
  })

  describe('for a teacher', () => {
    it('says an admin publishes, instead of a button', () => {
      const wrapper = mountPanel({ ...published, has_unpublished_changes: true }, { isAdmin: false })

      expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe(
        'Learners still get version 3. An admin publishes courses — your saved changes reach learners when they do.',
      )
      expect(wrapper.find('[data-test="status-panel-primary"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="status-panel-secondary"]').exists()).toBe(false)
    })

    it('says so on a draft too', () => {
      const wrapper = mountPanel({}, { isAdmin: false })

      expect(wrapper.get('[data-test="status-panel-message"]').text()).toBe(
        "Not published yet — learners can't find it. An admin publishes courses — your saved changes reach learners when they do.",
      )
    })
  })

  describe('seeing what learners see', () => {
    it('is offered once the course has a published version', async () => {
      const wrapper = mountPanel(published)

      await wrapper.get('[data-test="see-what-learners-see"]').trigger('click')
      expect(wrapper.emitted('preview')).toHaveLength(1)
    })

    it('is not offered for a course that was never published', () => {
      expect(mountPanel().find('[data-test="see-what-learners-see"]').exists()).toBe(false)
    })
  })
})
