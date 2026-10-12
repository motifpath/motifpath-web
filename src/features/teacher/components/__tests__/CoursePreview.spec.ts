import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import CoursePreview from '@/features/teacher/components/CoursePreview.vue'

const published = {
  course_id: 'c-1',
  title: 'Guitar foundations',
  summary: 'Your first chords, strumming and changes — in four short parts.',
  level: 'beginner',
  language: 'en',
  status: 'published',
  instrument_ids: [],
  created_by: { user_id: 't-1', display_name: 'Gilson Yamada' },
  checkpoints: [{ position: 1, title: 'First chords', items: [{ title: 'E minor' }, { title: 'A minor' }] }],
}

describe('CoursePreview', () => {
  let wrapper: ReturnType<typeof mount> | null = null
  beforeEach(() => GET.mockReset())
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  async function mountPreview() {
    wrapper = mount(CoursePreview, { props: { courseId: 'c-1' }, attachTo: document.body })
    await flushPromises()
    return wrapper
  }

  it('shows the learner’s course page for the published version under the Preview bar', async () => {
    GET.mockResolvedValueOnce({ data: published, error: undefined })
    await mountPreview()

    expect(GET).toHaveBeenCalledWith('/courses/{course_id}/published', { params: { path: { course_id: 'c-1' } } })
    expect(document.querySelector('[data-test="preview-bar"]')?.textContent).toContain('Preview — what learners see')
    expect(document.querySelector('[data-test="course-detail-title"]')?.textContent).toBe('Guitar foundations')
    expect(document.body.textContent).toContain('First chords')
  })

  it('its Enroll can’t be used in the preview', async () => {
    GET.mockResolvedValueOnce({ data: published, error: undefined })
    await mountPreview()

    const enroll = document.querySelector<HTMLButtonElement>('[data-test="preview-enroll"]')!
    expect(enroll.textContent?.trim()).toBe('Enroll (not in preview)')
    expect(enroll.disabled).toBe(true)
  })

  it('offers a retry when the published course fails to load', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' } })
    await mountPreview()

    GET.mockResolvedValueOnce({ data: published, error: undefined })
    document.querySelector<HTMLButtonElement>('[data-test="retry"]')!.click()
    await flushPromises()

    expect(document.querySelector('[data-test="course-detail-title"]')).not.toBeNull()
  })

  it('× closes it', async () => {
    GET.mockResolvedValueOnce({ data: published, error: undefined })
    await mountPreview()

    document.querySelector<HTMLButtonElement>('[data-test="preview-close"]')!.click()

    expect(wrapper!.emitted('close')).toHaveLength(1)
  })
})
