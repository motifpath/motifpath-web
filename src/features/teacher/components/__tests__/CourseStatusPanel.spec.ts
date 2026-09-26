import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import CourseStatusPanel from '@/features/teacher/components/CourseStatusPanel.vue'

type Course = components['schemas']['Course']

function course(overrides: Partial<Course> = {}): Course {
  return {
    course_id: 'c-1',
    title: 'Fingerstyle Foundations',
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

function mountPanel(overrides: Partial<Course> = {}, props: { isAdmin?: boolean; publishDisabled?: boolean; busy?: boolean } = {}) {
  return mount(CourseStatusPanel, {
    props: { course: course(overrides), isAdmin: true, publishDisabled: false, busy: false, ...props },
  })
}

describe('CourseStatusPanel', () => {
  const statuses: [Partial<Course>, string][] = [
    [{ status: 'draft' }, 'Draft'],
    [{ status: 'published', latest_published_version: 3 }, 'Published · v3'],
    [{ status: 'retired', latest_published_version: 2 }, 'Retired'],
  ]
  it.each(statuses)('shows the status %o as %s', (overrides, label) => {
    const wrapper = mountPanel(overrides)

    expect(wrapper.get('[data-test="course-status"]').text()).toBe(label)
  })

  it('flags unpublished changes', () => {
    const wrapper = mountPanel({ status: 'published', latest_published_version: 1, has_unpublished_changes: true })

    expect(wrapper.find('[data-test="unpublished-changes"]').exists()).toBe(true)
  })

  it('offers the published outline only once the course has been published', async () => {
    expect(mountPanel().find('[data-test="show-outline"]').exists()).toBe(false)

    const wrapper = mountPanel({ status: 'published', latest_published_version: 1 })
    await wrapper.get('[data-test="show-outline"]').trigger('click')
    expect(wrapper.emitted('showOutline')).toHaveLength(1)
  })

  describe('for an admin', () => {
    it('publishes a draft after confirmation', async () => {
      const wrapper = mountPanel()

      await wrapper.get('[data-test="publish-course"]').trigger('click')
      expect(wrapper.emitted('publish')).toBeUndefined()
      expect(wrapper.text()).toContain('Learners who enroll from now on get this version')

      await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')
      expect(wrapper.emitted('publish')).toHaveLength(1)
    })

    it('keeps Publish disabled when there is nothing new to publish', () => {
      const wrapper = mountPanel({ status: 'published', latest_published_version: 1 }, { publishDisabled: true })

      expect(wrapper.get('[data-test="publish-course"]').attributes('disabled')).toBeDefined()
    })

    it('retires a published course after confirmation', async () => {
      const wrapper = mountPanel({ status: 'published', latest_published_version: 1 })

      await wrapper.get('[data-test="retire-course"]').trigger('click')
      expect(wrapper.text()).toContain('Existing enrollments are unaffected')
      await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')

      expect(wrapper.emitted('retire')).toHaveLength(1)
    })

    it('does not retire a draft', () => {
      expect(mountPanel().find('[data-test="retire-course"]').exists()).toBe(false)
    })

    it('reactivates a retired course after confirmation, and offers nothing else', async () => {
      const wrapper = mountPanel({ status: 'retired', latest_published_version: 2 })

      expect(wrapper.find('[data-test="publish-course"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="retire-course"]').exists()).toBe(false)
      await wrapper.get('[data-test="reactivate-course"]').trigger('click')
      expect(wrapper.text()).toContain('returns to the catalog with its latest published version')
      await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')

      expect(wrapper.emitted('reactivate')).toHaveLength(1)
    })

    it('drops the question when cancelled', async () => {
      const wrapper = mountPanel()

      await wrapper.get('[data-test="publish-course"]').trigger('click')
      await wrapper.get('[data-test="confirm-dialog-cancel"]').trigger('click')

      expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
      expect(wrapper.emitted('publish')).toBeUndefined()
    })

    it('closes the question once the action has finished', async () => {
      const wrapper = mountPanel()
      await wrapper.get('[data-test="publish-course"]').trigger('click')
      await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')
      await wrapper.setProps({ busy: true })
      expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)

      await wrapper.setProps({ busy: false })

      expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    })
  })

  describe('for a teacher', () => {
    it('offers no publishing actions, and says an admin publishes', () => {
      const wrapper = mountPanel({ status: 'retired', latest_published_version: 1 }, { isAdmin: false })

      expect(wrapper.find('[data-test="publish-course"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="retire-course"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="reactivate-course"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="admin-publishes-note"]').text()).toContain('An admin publishes courses')
    })
  })
})
