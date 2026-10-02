import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, reactive } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

const currentUser = reactive({ profile: { role: 'teacher' as 'student' | 'teacher' | 'admin' } })
vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({
    isLoaded: { value: true },
    isSignedIn: { value: true },
    getToken: async () => 'jwt',
    signOut: vi.fn(async () => {}),
    displayInitial: { value: 'G' },
  }),
}))

function mockMatchMedia(compact: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: compact,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

import ExerciseListView from '@/features/teacher/views/ExerciseListView.vue'
import { knowledgeNode } from '@/shared/testUtils/knowledgeNode'

// The filter panel has its own spec; here it only needs to take the page's
// filter state and show the page's own extra filters.
const CourseFiltersStub = defineComponent({
  name: 'CourseFilters',
  props: {
    hasActiveFilters: Boolean,
    teacherScope: { type: String, default: null },
    instrumentFilter: Boolean,
    languageFilter: Boolean,
    levelFilter: { type: Boolean, default: true },
    singleClassification: Boolean,
    searchPlaceholder: { type: String, default: undefined },
    searchText: { type: String, default: '' },
  },
  emits: ['update:searchText', 'update:language', 'update:teacher', 'clear'],
  template: '<div data-test="course-filters"><slot /></div>',
})

function mountView() {
  return mount(ExerciseListView, {
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub, CourseFilters: CourseFiltersStub },
    },
  })
}

function page(items: unknown[], total = items.length) {
  return { data: { items, total, limit: 20, offset: 0 }, error: undefined, response: { status: 200 } }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('ExerciseListView', () => {
  beforeEach(() => {
    GET.mockReset()
    currentUser.profile.role = 'teacher'
    mockMatchMedia(false)
  })

  it('shows a permission-denied state for a student instead of the list', () => {
    currentUser.profile.role = 'student'
    GET.mockResolvedValueOnce({ data: { items: [], total: 0, limit: 20, offset: 0 }, error: undefined, response: { status: 200 } })
    const wrapper = mountView()

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(true)
  })

  it('shows a loading state while fetching', () => {
    GET.mockReturnValueOnce(new Promise(() => {}))
    const wrapper = mountView()

    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
  })

  it('shows an error state with retry when loading fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)

    GET.mockResolvedValueOnce({ data: { items: [], total: 0, limit: 20, offset: 0 }, error: undefined, response: { status: 200 } })
    await wrapper.get('[data-test="retry"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
  })

  it('shows an empty state with a link to create the first exercise', async () => {
    GET.mockResolvedValueOnce({ data: { items: [], total: 0, limit: 20, offset: 0 }, error: undefined, response: { status: 200 } })
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    const link = wrapper.get('[data-test="empty"]').findComponent(RouterLinkStub)
    expect(link.props('to')).toEqual({ name: 'teacher-exercise-new' })
  })

  it('lists exercises, each linking to its edit route', async () => {
    GET.mockResolvedValueOnce({
      data: {
        items: [
          { exercise_id: 'e-1', title: 'Name the chord', exercise_type: 'text_response', skills: [knowledgeNode('s-1', { names: { en: 'theory' } })], concepts: [] },
          { exercise_id: 'e-2', title: 'Pick the diagram', exercise_type: 'image_choice', skills: [], concepts: [] },
          { exercise_id: 'e-3', title: 'Pick the lick', exercise_type: 'audio_selection', skills: [], concepts: [] },
        ],
        total: 2,
        limit: 20,
        offset: 0,
      },
      error: undefined,
      response: { status: 200 },
    })
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.text()).toContain('Name the chord')
    expect(wrapper.text()).toContain('Pick the diagram')
    expect(wrapper.text()).toContain('Pick the lick')
    expect(wrapper.text()).toContain('Audio selection')

    const links = wrapper
      .findAllComponents(RouterLinkStub)
      .filter((l) => typeof l.props('to') === 'object' && (l.props('to') as { name?: string }).name === 'teacher-exercise-edit')
    expect(links.map((l) => l.props('to'))).toEqual(
      expect.arrayContaining([
        { name: 'teacher-exercise-edit', params: { id: 'e-1' } },
        { name: 'teacher-exercise-edit', params: { id: 'e-2' } },
      ]),
    )
  })

  it('loads the next page when the teacher asks for more', async () => {
    GET.mockResolvedValueOnce({
      data: { items: [{ exercise_id: 'e-1', title: 'Name the chord', exercise_type: 'text_response' }], total: 2, limit: 20, offset: 0 },
      error: undefined,
      response: { status: 200 },
    })
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toContain('Showing 1 of 2')

    GET.mockResolvedValueOnce({
      data: { items: [{ exercise_id: 'e-2', title: 'Pick the diagram', exercise_type: 'image_choice' }], total: 2, limit: 20, offset: 1 },
      error: undefined,
      response: { status: 200 },
    })
    await wrapper.get('[data-test="load-more"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(GET).toHaveBeenLastCalledWith('/exercises', { params: { query: { limit: 20, offset: 1 } } })
    expect(wrapper.findAll('[data-test="exercise-row"]')).toHaveLength(2)
    expect(wrapper.find('[data-test="load-more"]').exists()).toBe(false)
  })

  it('offers search, language, creator and single skill and concept filters, but no level or instrument', async () => {
    GET.mockResolvedValue(page([]))
    const wrapper = mountView()
    await flush()

    const panel = wrapper.getComponent(CourseFiltersStub)
    expect(panel.props()).toMatchObject({
      teacherScope: 'exercises',
      languageFilter: true,
      instrumentFilter: false,
      levelFilter: false,
      singleClassification: true,
      searchPlaceholder: 'Search exercises by title',
    })
  })

  it('narrows the list to one exercise type', async () => {
    GET.mockResolvedValue(page([]))
    const wrapper = mountView()
    await flush()

    await wrapper.get('[data-test="exercise-type-filter"]').setValue('audio_selection')
    await flush()

    expect(GET).toHaveBeenLastCalledWith('/exercises', { params: { query: { limit: 20, offset: 0, exercise_type: 'audio_selection' } } })
  })

  it('offers to clear the filters when they match nothing', async () => {
    GET.mockResolvedValue(page([]))
    const wrapper = mountView()
    await flush()
    await wrapper.get('[data-test="exercise-type-filter"]').setValue('image_choice')
    await flush()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)
    await wrapper.get('[data-test="no-matches"] [data-test="clear-filters"]').trigger('click')
    await flush()

    expect(GET).toHaveBeenLastCalledWith('/exercises', { params: { query: { limit: 20, offset: 0 } } })
    expect(wrapper.get<HTMLSelectElement>('[data-test="exercise-type-filter"]').element.selectedIndex).toBe(0)
  })

  it("names each exercise's creator when one is recorded", async () => {
    GET.mockResolvedValueOnce(page([
      { exercise_id: 'e-1', title: 'Name the chord', exercise_type: 'text_response', created_by: { user_id: 'u-1', display_name: 'Bob Ferreira' } },
      { exercise_id: 'e-2', title: 'Legacy drill', exercise_type: 'text_response' },
    ]))
    const wrapper = mountView()
    await flush()

    const rows = wrapper.findAll('[data-test="exercise-row"]')
    expect(rows[0]!.get('[data-test="exercise-creator"]').text()).toBe('Bob Ferreira')
    expect(rows[1]!.find('[data-test="exercise-creator"]').exists()).toBe(false)
  })
})
