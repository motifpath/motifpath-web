import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { makeStudentPathItem as step } from '@/features/student/testing/studentPathItem'

type StudentPathView = Pick<components['schemas']['StudentPathView'], 'title' | 'items'>

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

  it('renders an unlabelled path as a single flat list, not one list per step', () => {
    state.isLoading.value = false
    state.error.value = null
    state.data.value = { title: 'Blues Foundations', items: [step(1), step(2), step(3)] }

    const wrapper = mountView()

    expect(wrapper.findAll('[data-test="path-section"]')).toHaveLength(1)
    expect(wrapper.findAll('ol')).toHaveLength(1)
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

  it('keeps one continuous 1..N ordering across section lists', () => {
    state.isLoading.value = false
    state.error.value = null
    state.data.value = {
      title: 'Rhythm Foundations',
      items: [
        step(1, 'Open chords'),
        step(2, 'Open chords'),
        step(3, 'Strumming patterns'),
        step(4, 'Strumming patterns'),
      ],
    }

    const wrapper = mountView()
    const lists = wrapper.findAll('[data-test="path-section"] ol')

    expect(lists).toHaveLength(2)
    expect(lists[0].attributes('start')).toBe('1')
    expect(lists[1].attributes('start')).toBe('3')

    // Tailwind's preflight strips list markers, so the ordinal has to be
    // rendered rather than left to `start` alone — otherwise the continuous
    // numbering this test guards is invisible to the student.
    const numbers = wrapper.findAll('[data-test="step-position"]').map((n) => n.text())
    expect(numbers).toEqual(['1', '2', '3', '4'])
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
