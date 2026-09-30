import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type * as VueRouter from 'vue-router'

import type { components } from '@/api/generated/core-domain'

type PathDetail = components['schemas']['PathDetail']
type StudentPath = components['schemas']['StudentPath']

const detail = {
  path: ref<PathDetail | null>(null),
  isLoading: ref(false),
  error: ref(false),
  notFound: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/useCatalogPath', () => ({
  useCatalogPath: () => detail,
}))

const held = { paths: ref<StudentPath[]>([]), isLoading: ref(false), error: ref(false), retry: vi.fn() }
vi.mock('@/features/student/composables/useMyStandalonePaths', () => ({
  useMyStandalonePaths: () => held,
}))

const enrollInLearningPath = vi.fn()
vi.mock('@/features/student/composables/useEnrollInLearningPath', () => ({
  useEnrollInLearningPath: () => ({ enrollInLearningPath }),
}))

const toast = { success: vi.fn(), error: vi.fn() }
vi.mock('@/shared/composables/useToast', () => ({
  useToast: () => toast,
}))

const push = vi.fn()
const route = { params: { learningPathId: 'lp-1' }, query: { fromCatalog: 'true' } as Record<string, string> }
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRoute: () => route, useRouter: () => ({ push }) }
})

import PathDetailView from '@/features/student/views/PathDetailView.vue'

function pathDetail(overrides: Partial<PathDetail> = {}): PathDetail {
  return {
    learning_path_id: 'lp-1',
    title: 'Open chords',
    summary: 'Your first five chords, cleanly.',
    level: 'beginner',
    language: 'en',
    created_by: { user_id: 'teacher-1', display_name: 'Bob Martins' },
    instrument_ids: [],
    lesson_count: 4,
    items: [],
    ...overrides,
  }
}

function heldCopy(overrides: Partial<StudentPath> = {}): StudentPath {
  return {
    student_path_id: 'sp-1',
    student: { user_id: 'st-1', display_name: 'Alice Souza' },
    source_template_id: 'lp-1',
    title: 'Open chords',
    assigned_by: { user_id: 'st-1', display_name: 'Alice Souza' },
    assigned_at: '2026-09-01T00:00:00Z',
    archived_at: null,
    source_course_enrollment_id: null,
    course_checkpoint_position: null,
    lesson_count: 4,
    completed_count: 1,
    ...overrides,
  }
}

function mountView() {
  return mount(PathDetailView, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

describe('PathDetailView', () => {
  beforeEach(() => {
    detail.path.value = pathDetail()
    detail.isLoading.value = false
    detail.error.value = false
    detail.notFound.value = false
    held.paths.value = []
    route.query = { fromCatalog: 'true' }
    vi.clearAllMocks()
  })

  it('shows the path before enrollment, and a Back link that keeps the catalog journey', () => {
    const wrapper = mountView()

    expect(wrapper.get('[data-test="back-to-catalog"]').findComponent(RouterLinkStub).props('to')).toEqual({
      name: 'path-catalog',
      query: { returnFromPath: 'lp-1' },
    })
    expect(wrapper.get('[data-test="path-detail-title"]').text()).toBe('Open chords')
    expect(wrapper.get('[data-test="path-detail-byline"]').text()).toContain('Bob Martins')
    expect(wrapper.get('[data-test="path-detail-lessons"]').text()).toBe('4 lessons')
    expect(wrapper.text()).toContain('Your first five chords, cleanly.')
    expect(wrapper.get('[data-test="enroll"]').text()).toBe('Enroll')
  })

  it('opens a fresh catalog when the learner did not come from it', () => {
    route.query = {}

    const wrapper = mountView()

    expect(wrapper.get('[data-test="back-to-catalog"]').findComponent(RouterLinkStub).props('to')).toEqual({
      name: 'path-catalog',
    })
  })

  it('outlines the lessons by section', () => {
    detail.path.value = pathDetail({
      items: [
        { title: 'Welcome' },
        { title: 'E major', section_label: 'Chords' },
        { title: 'A minor', section_label: 'Chords' },
        { title: 'Strum it', section_label: 'Rhythm' },
      ],
    })

    const wrapper = mountView()

    const sections = wrapper.findAll('[data-test="outline-section"]')
    expect(sections.map((s) => s.find('h3').exists() ? s.get('h3').text() : null)).toEqual([null, 'Chords', 'Rhythm'])
    expect(sections.map((s) => s.findAll('li').map((li) => li.text()))).toEqual([
      ['Welcome'],
      ['E major', 'A minor'],
      ['Strum it'],
    ])
  })

  it('enrolls and takes the learner to the path, which is now their current one', async () => {
    enrollInLearningPath.mockResolvedValueOnce(heldCopy())
    const wrapper = mountView()

    await wrapper.get('[data-test="enroll"]').trigger('click')
    await flushPromises()

    expect(enrollInLearningPath).toHaveBeenCalledWith('lp-1')
    expect(toast.success).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith({ name: 'path' })
  })

  it('offers to continue a path the learner already holds, reopening their copy', async () => {
    held.paths.value = [heldCopy()]
    enrollInLearningPath.mockResolvedValueOnce(heldCopy())
    const wrapper = mountView()

    const action = wrapper.get('[data-test="enroll"]')
    expect(action.text()).toBe('Continue path')
    await action.trigger('click')
    await flushPromises()

    expect(enrollInLearningPath).toHaveBeenCalledWith('lp-1')
    expect(toast.success).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith({ name: 'path' })
  })

  it('does not count an archived copy as held', () => {
    held.paths.value = [heldCopy({ archived_at: '2026-09-10T00:00:00Z' })]

    expect(mountView().get('[data-test="enroll"]').text()).toBe('Enroll')
  })

  it('reports a failed enrollment and lets the learner try again', async () => {
    enrollInLearningPath.mockRejectedValueOnce(new Error('Learning path not found'))
    const wrapper = mountView()

    await wrapper.get('[data-test="enroll"]').trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Learning path not found')
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="enroll"]').attributes('disabled')).toBeUndefined()
  })

  it('shows loading, not-found and error states', async () => {
    detail.path.value = null
    detail.isLoading.value = true
    const wrapper = mountView()
    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)

    detail.isLoading.value = false
    detail.notFound.value = true
    await flushPromises()
    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)

    detail.notFound.value = false
    detail.error.value = true
    await flushPromises()
    await wrapper.get('[data-test="error"] button').trigger('click')
    expect(detail.retry).toHaveBeenCalled()
  })
})
