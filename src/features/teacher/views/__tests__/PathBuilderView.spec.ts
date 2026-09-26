import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import type * as VueRouter from 'vue-router'

const POST = vi.fn()
const GET = vi.fn()
const PUT = vi.fn()
const DELETE = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST, GET, PUT, DELETE }, eventApi: {} }),
}))

const route = reactive<{ params: { id?: string } }>({ params: {} })
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRoute: () => route }
})

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

import PathBuilderView from '@/features/teacher/views/PathBuilderView.vue'

function mountView() {
  return mount(PathBuilderView, {
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub },
    },
  })
}

const contentNodePool = [
  { content_node_id: 'cn-1', title: 'Open position triads', content_type: 'video', teacher: { user_id: 't-1', display_name: 'Teacher One' }, classification: { skill: 's', concept: 'c', difficulty_level: 'beginner', review_state: 'pending' }, languages: [], created_at: '2026-01-01T00:00:00Z' },
  { content_node_id: 'cn-2', title: 'Reading the fretboard', content_type: 'article', teacher: { user_id: 't-1', display_name: 'Teacher One' }, classification: { skill: 's', concept: 'c', difficulty_level: 'beginner', review_state: 'pending' }, languages: [], created_at: '2026-01-01T00:00:00Z' },
]

const learningPathFixture = {
  learning_path_id: 'lp-1',
  teacher: { user_id: 't-1', display_name: 'Teacher One' },
  title: 'Beginner path',
  level: 'intermediate',
  instrument_ids: ['i-guitar'],
  thumbnail_url: 'https://cdn.test/thumbnails/path.png',
  items: [
    { position: 1, content_node_id: 'cn-1', title: 'Open position triads', content_type: 'video', section_label: 'Chords' },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
}

const instruments = [
  { instrument_id: 'i-guitar', names: { en: 'Guitar' }, languages: ['en'] },
  { instrument_id: 'i-bass', names: { en: 'Bass' }, languages: ['en'] },
]

/**
 * GET is called for both the content node pool (feeding the picker) and,
 * in edit mode, the learning path itself -- route by path so each test only
 * overrides what it cares about.
 */
function routeGET(overrides: Record<string, unknown>) {
  GET.mockImplementation((path: string) => {
    if (path in overrides) return Promise.resolve(overrides[path])
    if (path === '/instruments') {
      return Promise.resolve({ data: instruments, error: undefined, response: { status: 200 } })
    }
    if (path === '/content-nodes') {
      return Promise.resolve({
        data: { items: contentNodePool, total: contentNodePool.length, limit: 100, offset: 0 },
        error: undefined,
        response: { status: 200 },
      })
    }
    return Promise.resolve({ data: undefined, error: { message: 'unhandled in test' }, response: { status: 500 } })
  })
}

describe('PathBuilderView', () => {
  beforeEach(() => {
    POST.mockReset()
    GET.mockReset()
    PUT.mockReset()
    DELETE.mockReset()
    route.params = {}
    currentUser.profile.role = 'teacher'
    mockMatchMedia(false)
    routeGET({})
  })

  it('shows a permission-denied state for a student', () => {
    currentUser.profile.role = 'student'
    const wrapper = mountView()

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(true)
  })

  describe('create mode', () => {
    it('disables save until at least one content node has been added', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.get('[data-test="app-bar-save"]').attributes('disabled')).toBeDefined()
    })

    it('adds a content node via the picker and posts a CreateLearningPathRequest on save', async () => {
      POST.mockResolvedValueOnce({
        data: { ...learningPathFixture, items: [{ position: 1, content_node_id: 'cn-1', title: 'Open position triads', content_type: 'video' }] },
        error: undefined,
        response: { status: 201 },
      })
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('input[placeholder="Untitled path"]').setValue('Beginner path')
      await wrapper.get('[data-test="level-option-beginner"]').trigger('click')
      await wrapper.get('[data-test="add-content-node"]').trigger('click')
      await wrapper.get('[data-test="content-node-picker-row"]').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Open position triads')

      await wrapper.get('[data-test="app-bar-save"]').trigger('click')
      await flushPromises()

      expect(POST).toHaveBeenCalledWith('/learning-paths', {
        body: {
          title: 'Beginner path',
          level: 'beginner',
          instrument_ids: [],
          items: [{ content_node_id: 'cn-1', section_label: undefined }],
        },
      })
    })

    it('disables save until a level is chosen', async () => {
      const wrapper = mountView()
      await flushPromises()
      await wrapper.get('[data-test="add-content-node"]').trigger('click')
      await wrapper.get('[data-test="content-node-picker-row"]').trigger('click')

      expect(wrapper.get('[data-test="app-bar-save"]').attributes('disabled')).toBeDefined()

      await wrapper.get('[data-test="level-option-advanced"]').trigger('click')
      expect(wrapper.get('[data-test="app-bar-save"]').attributes('disabled')).toBeUndefined()
    })

    it('starts at every instrument and sends the instruments picked', async () => {
      POST.mockResolvedValueOnce({ data: learningPathFixture, error: undefined, response: { status: 201 } })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.get('[data-test="instrument-every"]').attributes('aria-pressed')).toBe('true')

      await wrapper.get('[data-test="level-option-beginner"]').trigger('click')
      await wrapper.get('[data-test="instrument-option-i-bass"]').trigger('click')
      await wrapper.get('[data-test="add-content-node"]').trigger('click')
      await wrapper.get('[data-test="content-node-picker-row"]').trigger('click')
      await wrapper.get('[data-test="app-bar-save"]').trigger('click')
      await flushPromises()

      expect(POST.mock.calls[0]?.[1].body.instrument_ids).toEqual(['i-bass'])
    })
  })

  describe('edit mode', () => {
    beforeEach(() => {
      route.params = { id: 'lp-1' }
    })

    it('loads the learning path by id and pre-fills title and items', async () => {
      routeGET({ '/learning-paths/{learning_path_id}': { data: learningPathFixture, error: undefined, response: { status: 200 } } })
      const wrapper = mountView()
      await flushPromises()

      expect(GET).toHaveBeenCalledWith('/learning-paths/{learning_path_id}', { params: { path: { learning_path_id: 'lp-1' } } })
      expect((wrapper.get('input[placeholder="Untitled path"]').element as HTMLInputElement).value).toBe('Beginner path')
      expect(wrapper.text()).toContain('Open position triads')
      expect(wrapper.text()).toContain('Chords')
      expect(wrapper.get('[data-test="level-option-intermediate"]').attributes('aria-checked')).toBe('true')
      expect(wrapper.get('[data-test="instrument-option-i-guitar"]').attributes('aria-pressed')).toBe('true')
      expect(wrapper.get('img').attributes('src')).toBe('https://cdn.test/thumbnails/path.png')
    })

    it('shows no level for a path created before levels, and blocks save until one is chosen', async () => {
      const legacyPath = { ...learningPathFixture, level: undefined }
      routeGET({ '/learning-paths/{learning_path_id}': { data: legacyPath, error: undefined, response: { status: 200 } } })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.findAll('[role="radio"][aria-checked="true"]')).toHaveLength(0)
      expect(wrapper.get('[data-test="app-bar-save"]').attributes('disabled')).toBeDefined()

      await wrapper.get('[data-test="level-option-beginner"]').trigger('click')
      expect(wrapper.get('[data-test="app-bar-save"]').attributes('disabled')).toBeUndefined()
    })

    it('sends no thumbnail once it has been removed', async () => {
      routeGET({ '/learning-paths/{learning_path_id}': { data: learningPathFixture, error: undefined, response: { status: 200 } } })
      PUT.mockResolvedValueOnce({ data: learningPathFixture, error: undefined, response: { status: 200 } })
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-test="thumbnail-remove"]').trigger('click')
      await wrapper.get('[data-test="app-bar-save"]').trigger('click')
      await flushPromises()

      expect(PUT.mock.calls[0]?.[1].body).not.toHaveProperty('thumbnail_url')
    })

    it('submits via PUT with the replace request shape', async () => {
      routeGET({ '/learning-paths/{learning_path_id}': { data: learningPathFixture, error: undefined, response: { status: 200 } } })
      PUT.mockResolvedValueOnce({ data: learningPathFixture, error: undefined, response: { status: 200 } })
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('input[placeholder="Untitled path"]').setValue('Updated path title')
      await wrapper.get('[data-test="app-bar-save"]').trigger('click')
      await flushPromises()

      expect(PUT).toHaveBeenCalledWith('/learning-paths/{learning_path_id}', {
        params: { path: { learning_path_id: 'lp-1' } },
        body: {
          title: 'Updated path title',
          level: 'intermediate',
          instrument_ids: ['i-guitar'],
          thumbnail_url: 'https://cdn.test/thumbnails/path.png',
          items: [{ content_node_id: 'cn-1', section_label: 'Chords' }],
        },
      })
    })

    it('removes an item from the local list when the list emits remove', async () => {
      routeGET({ '/learning-paths/{learning_path_id}': { data: learningPathFixture, error: undefined, response: { status: 200 } } })
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-test="remove-item"]').trigger('click')

      expect(wrapper.text()).not.toContain('Open position triads')
      expect(wrapper.get('[data-test="app-bar-save"]').attributes('disabled')).toBeDefined()
    })

    it('shows an error state with retry when loading the learning path fails', async () => {
      routeGET({ '/learning-paths/{learning_path_id}': { data: undefined, error: { message: 'boom' }, response: { status: 500 } } })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('[data-test="load-error"]').exists()).toBe(true)
    })
  })
})
