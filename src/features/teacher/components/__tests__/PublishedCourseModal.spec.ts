import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import PublishedCourseModal from '@/features/teacher/components/PublishedCourseModal.vue'

const outline = {
  course_id: 'c-1',
  title: 'Fingerstyle Foundations',
  summary: 'Fingerpicking from the first pattern.',
  level: 'beginner',
  language: 'en',
  status: 'published',
  instrument_ids: [],
  checkpoints: [
    {
      position: 1,
      title: 'Stage 1: Open chords',
      items: [
        { title: 'E minor', section_label: 'Chords' },
        { title: 'A minor', section_label: 'Chords' },
        { title: 'Strumming' },
      ],
    },
  ],
}

describe('PublishedCourseModal', () => {
  beforeEach(() => GET.mockReset())

  it("shows the published version's checkpoints and their items, grouped by section", async () => {
    GET.mockResolvedValueOnce({ data: outline, error: undefined })
    const wrapper = mount(PublishedCourseModal, { props: { courseId: 'c-1' } })
    await flushPromises()

    expect(GET).toHaveBeenCalledWith('/courses/{course_id}/published', { params: { path: { course_id: 'c-1' } } })
    expect(wrapper.text()).toContain('Fingerstyle Foundations')
    const checkpoint = wrapper.get('[data-test="outline-checkpoint"]')
    expect(checkpoint.text()).toContain('Stage 1: Open chords')
    const sections = checkpoint.findAll('[data-test="outline-section"]')
    expect(sections.map((s) => s.text())).toEqual(['ChordsE minorA minor', 'Strumming'])
  })

  it('shows an error with a retry when the outline fails to load', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' } })
    const wrapper = mount(PublishedCourseModal, { props: { courseId: 'c-1' } })
    await flushPromises()

    GET.mockResolvedValueOnce({ data: outline, error: undefined })
    await wrapper.get('[data-test="retry"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="outline-checkpoint"]').exists()).toBe(true)
  })

  it('closes', async () => {
    GET.mockResolvedValueOnce({ data: outline, error: undefined })
    const wrapper = mount(PublishedCourseModal, { props: { courseId: 'c-1' } })
    await flushPromises()

    await wrapper.get('[data-test="close-modal"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
