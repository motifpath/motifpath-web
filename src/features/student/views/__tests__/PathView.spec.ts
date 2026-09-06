import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type StudentPathItem = components['schemas']['StudentPathItem']
type StudentPathView = { title: string; items: StudentPathItem[] }

function step(position: number, sectionLabel?: string): StudentPathItem {
  return {
    position,
    content_node_id: `node-${position}`,
    title: `Step ${position}`,
    content_type: 'video',
    status: 'not_started',
    ...(sectionLabel === undefined ? {} : { section_label: sectionLabel }),
  }
}

const state = {
  data: ref<StudentPathView | null>(null),
  error: ref<string | null>(null),
  isLoading: ref(false),
  retry: vi.fn(),
}

vi.mock('@/features/student/composables/useStudentPath', () => ({
  useStudentPath: () => state,
}))

import PathView from '@/features/student/views/PathView.vue'

function mountView() {
  return mount(PathView, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

describe('PathView', () => {
  it('shows a loading state while the path request is in flight', () => {
    state.isLoading.value = true
    state.error.value = null
    state.data.value = null

    expect(mountView().find('[data-test="loading"]').exists()).toBe(true)
  })

  it('shows an error state with a retry control on failure', async () => {
    state.isLoading.value = false
    state.error.value = 'load-failed'
    state.data.value = null

    const wrapper = mountView()
    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(state.retry).toHaveBeenCalled()
  })

  it('renders the path title once loaded', () => {
    state.isLoading.value = false
    state.error.value = null
    state.data.value = { title: 'Blues Foundations', items: [] }

    expect(mountView().text()).toContain('Blues Foundations')
  })

  it('renders every step and no section headings for an unlabelled path', () => {
    state.isLoading.value = false
    state.error.value = null
    state.data.value = { title: 'Blues Foundations', items: [step(1), step(2), step(3)] }

    const wrapper = mountView()

    expect(wrapper.findAll('[data-test="path-step"]')).toHaveLength(3)
    expect(wrapper.find('[data-test="section-heading"]').exists()).toBe(false)
  })

  it('renders a section heading above each labelled run of steps', () => {
    state.isLoading.value = false
    state.error.value = null
    state.data.value = {
      title: 'Rhythm Foundations',
      items: [step(1, 'Open chords'), step(2, 'Open chords'), step(3, 'Strumming patterns')],
    }

    const headings = mountView().findAll('[data-test="section-heading"]')

    expect(headings.map((h) => h.text())).toEqual(['Open chords', 'Strumming patterns'])
  })

  it('does not merge a label reused after an unlabelled gap', () => {
    state.isLoading.value = false
    state.error.value = null
    state.data.value = {
      title: 'Rhythm Foundations',
      items: [step(1, 'Open chords'), step(2), step(3, 'Open chords')],
    }

    const headings = mountView().findAll('[data-test="section-heading"]')

    expect(headings.map((h) => h.text())).toEqual(['Open chords', 'Open chords'])
  })

  it('shows a first-class holding state when no path is assigned yet', () => {
    state.isLoading.value = false
    state.error.value = 'no-path'
    state.data.value = null

    const wrapper = mountView()
    const holding = wrapper.get('[data-test="no-path"]')

    expect(holding.text()).toContain('teacher')
    expect(holding.text().toLowerCase()).toContain('personalized path')
  })
})
