import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

const currentUser = reactive({
  profile: { user_id: 'u-teacher', role: 'teacher' as 'student' | 'teacher' | 'admin', display_name: 'Bob Ferreira' },
})
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

import ExerciseListView from '@/features/teacher/views/ExerciseListView.vue'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { mockViewport } from '@/shared/testUtils/viewport'

const GUITAR = 'instrument-guitar'

function exercise(id: string, overrides: Record<string, unknown> = {}) {
  return {
    exercise_id: id,
    title: `Exercise ${id}`,
    exercise_type: 'audio_recognition',
    skills: [],
    concepts: [],
    languages: [{ code: 'en', name: 'English' }],
    instrument_ids: [GUITAR],
    ...overrides,
  }
}

function answer(exercises: unknown[]) {
  GET.mockImplementation((path: string) => {
    if (path === '/exercises') return Promise.resolve({ data: { items: exercises, total: exercises.length, limit: 20, offset: 0 } })
    if (path === '/instruments') return Promise.resolve({ data: [makeFrettedInstrument({ names: { en: 'Guitar' } })] })
    return Promise.resolve({ data: [] })
  })
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/teach/exercises', name: 'teacher-exercises', component: ExerciseListView }],
  })
  await router.push('/teach/exercises')
  await router.isReady()
  const wrapper = mount(ExerciseListView, {
    global: { plugins: [createPinia(), router], stubs: { RouterLink: RouterLinkStub } },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  GET.mockReset()
  answer([])
  window.localStorage.clear()
  currentUser.profile.role = 'teacher'
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
  mockViewport(390)
})
afterEach(() => vi.unstubAllGlobals())

describe('ExerciseListView', () => {
  it('shows a permission-denied state for a student instead of the list', async () => {
    currentUser.profile.role = 'student'
    const wrapper = await mountView()

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(true)
  })

  it('offers a new exercise from the title', async () => {
    const wrapper = await mountView()

    expect(wrapper.get('h1').text()).toBe('Exercises')
    expect(wrapper.get('[data-test="authoring-new"]').findComponent(RouterLinkStub).props('to')).toEqual({
      name: 'teacher-exercise-new',
    })
  })

  it('lists each exercise as a row with its type, instrument and language, opening its editor', async () => {
    answer([exercise('e-1', { title: 'Which interval did you hear?' })])
    const wrapper = await mountView()

    expect(wrapper.get('[data-test="authoring-row-title"]').text()).toBe('Which interval did you hear?')
    expect(wrapper.get('[data-test="authoring-row-meta"]').text()).toBe('Audio recognition · Guitar · English')
    const links = wrapper
      .findAllComponents(RouterLinkStub)
      .map((link) => link.props('to'))
      .filter((to) => typeof to === 'object' && 'name' in to && to.name === 'teacher-exercise-edit')
    expect(links).toEqual([{ name: 'teacher-exercise-edit', params: { id: 'e-1' } }])
  })

  it('says an exercise for every instrument is for every instrument', async () => {
    answer([exercise('e-1', { instrument_ids: [], languages: [] })])
    const wrapper = await mountView()

    expect(wrapper.get('[data-test="authoring-row-meta"]').text()).toBe('Audio recognition · Every instrument')
  })

  it('shows no status on exercises, which are used, not published', async () => {
    answer([exercise('e-1')])
    const wrapper = await mountView()

    expect(wrapper.find('[data-test="authoring-row-status"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="status-chips"]').exists()).toBe(false)
  })

  it('offers the Exercises filters, with Type and no diagram-only filters', async () => {
    const wrapper = await mountView()

    await wrapper.get('[data-test="authoring-filters-button"] button').trigger('click')

    expect(wrapper.find('[data-test="filter-group-type"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="filter-group-root"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="filter-group-kind"]').exists()).toBe(false)
  })
})
