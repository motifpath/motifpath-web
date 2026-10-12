import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'

import { useAuthoringStatusChip } from '@/features/teacher/composables/useAuthoringStatusChip'

let chips!: ReturnType<typeof useAuthoringStatusChip>
mount(
  defineComponent({
    setup() {
      chips = useAuthoringStatusChip()
      return () => null
    },
  }),
)
const { lessonStatus, pathStatus, courseStatus } = chips

describe('useAuthoringStatusChip', () => {
  it('calls a lesson never published a draft', () => {
    expect(lessonStatus({ latest_published_version: null, has_unpublished_changes: true })).toEqual({ label: 'Draft', tone: 'accent' })
  })

  it('names the version learners get of a published lesson', () => {
    expect(lessonStatus({ latest_published_version: 3, has_unpublished_changes: false })).toEqual({
      label: 'Published · v3',
      tone: 'success',
    })
  })

  it('says a published lesson has unpublished changes', () => {
    expect(lessonStatus({ latest_published_version: 3, has_unpublished_changes: true })).toEqual({
      label: 'Unpublished changes',
      tone: 'warning',
    })
  })

  it('calls a path draft or published', () => {
    expect(pathStatus({ status: 'draft' })).toEqual({ label: 'Draft', tone: 'accent' })
    expect(pathStatus({ status: 'published' })).toEqual({ label: 'Published', tone: 'success' })
  })

  it('calls a course retired, draft, published or with unpublished changes', () => {
    expect(courseStatus({ status: 'retired', has_unpublished_changes: false })).toEqual({ label: 'Retired', tone: 'neutral' })
    expect(courseStatus({ status: 'draft' })).toEqual({ label: 'Draft', tone: 'accent' })
    expect(courseStatus({ status: 'published', has_unpublished_changes: true })).toEqual({
      label: 'Unpublished changes',
      tone: 'warning',
    })
    expect(courseStatus({ status: 'published' })).toEqual({ label: 'Published', tone: 'success' })
  })
})
