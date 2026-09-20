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

import ContentAuthoringView from '@/features/teacher/views/ContentAuthoringView.vue'

function mountView() {
  return mount(ContentAuthoringView, {
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub },
    },
  })
}

const contentNodeFixture = {
  content_node_id: 'cn-1',
  teacher_id: 't-1',
  title: 't',
  content_type: 'video',
  classification: { skill: 's', concept: 'c', difficulty_level: 'beginner', review_state: 'pending' },
  languages: [],
  created_at: '2026-01-01T00:00:00Z',
}

/**
 * GET is called for several different resources once a content node id is
 * known (the node itself, its challenges, a challenge's linked exercises,
 * the exercise pool for the picker) — routes by path so each test only
 * needs to override what it cares about, defaulting everything else to an
 * empty/absent result.
 */
function routeGET(overrides: Record<string, unknown>) {
  GET.mockImplementation((path: string) => {
    if (path in overrides) return Promise.resolve(overrides[path])
    if (path === '/content-nodes/{content_node_id}/challenges' || path === '/exercises') {
      return Promise.resolve({ data: [], error: undefined, response: { status: 200 } })
    }
    return Promise.resolve({ data: undefined, error: { message: 'unhandled in test' }, response: { status: 500 } })
  })
}

describe('ContentAuthoringView', () => {
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
    it('posts a CreateContentNodeRequest on save', async () => {
      routeGET({})
      POST.mockResolvedValueOnce({
        data: {
          content_node_id: 'cn-1',
          teacher_id: 't-1',
          title: 'Alternate picking basics',
          content_type: 'video',
          classification: { skill: 'alternate-picking', concept: 'picking-technique', difficulty_level: 'beginner', review_state: 'pending' },
          languages: [],
          created_at: '2026-01-01T00:00:00Z',
        },
        error: undefined,
        response: { status: 201 },
      })
      const wrapper = mountView()

      await wrapper.get('input[placeholder="Untitled content"]').setValue('Alternate picking basics')
      await wrapper.get('[data-test="skill"]').setValue('alternate-picking')
      await wrapper.get('[data-test="concept"]').setValue('picking-technique')
      await wrapper.get('[data-test="app-bar-save"]').trigger('click')
      await flushPromises()

      expect(POST).toHaveBeenCalledWith('/content-nodes', {
        body: {
          title: 'Alternate picking basics',
          content_type: 'video',
          classification: { skill: 'alternate-picking', concept: 'picking-technique', difficulty_level: 'beginner' },
          language_codes: ['any'],
        },
      })
    })

    it('shows the challenge section, with no challenge yet, once the node is saved', async () => {
      routeGET({})
      POST.mockResolvedValueOnce({ data: contentNodeFixture, error: undefined, response: { status: 201 } })
      const wrapper = mountView()

      await wrapper.get('input[placeholder="Untitled content"]').setValue('t')
      await wrapper.get('[data-test="skill"]').setValue('s')
      await wrapper.get('[data-test="concept"]').setValue('c')
      await wrapper.get('[data-test="app-bar-save"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-test="challenge-section"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="no-challenge"]').exists()).toBe(true)
    })
  })

  describe('edit mode', () => {
    beforeEach(() => {
      route.params = { id: 'cn-1' }
    })

    it('loads the content node by id and pre-fills the form', async () => {
      routeGET({ '/content-nodes/{content_node_id}': { data: contentNodeFixture, error: undefined, response: { status: 200 } } })
      const wrapper = mountView()
      await flushPromises()

      expect(GET).toHaveBeenCalledWith('/content-nodes/{content_node_id}', { params: { path: { content_node_id: 'cn-1' } } })
      expect((wrapper.get('input[placeholder="Untitled content"]').element as HTMLInputElement).value).toBe('t')
      expect(wrapper.get('[data-test="review-state"]').text()).toContain('pending')
    })

    it('disables the content type toggle -- type cannot change after creation', async () => {
      routeGET({ '/content-nodes/{content_node_id}': { data: contentNodeFixture, error: undefined, response: { status: 200 } } })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.get('[data-test="content-type-video"]').attributes('disabled')).toBeDefined()
    })

    it('submits via PUT with the update request shape, and reports success', async () => {
      routeGET({ '/content-nodes/{content_node_id}': { data: contentNodeFixture, error: undefined, response: { status: 200 } } })
      PUT.mockResolvedValueOnce({
        data: { ...contentNodeFixture, title: 'Updated title' },
        error: undefined,
        response: { status: 200 },
      })
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('input[placeholder="Untitled content"]').setValue('Updated title')
      await wrapper.get('[data-test="app-bar-save"]').trigger('click')
      await flushPromises()

      expect(PUT).toHaveBeenCalledWith('/content-nodes/{content_node_id}', {
        params: { path: { content_node_id: 'cn-1' } },
        body: {
          title: 'Updated title',
          classification: { skill: 's', concept: 'c', difficulty_level: 'beginner' },
          language_codes: ['any'],
        },
      })
    })

    it('shows an error state with retry when loading the content node fails', async () => {
      routeGET({ '/content-nodes/{content_node_id}': { data: undefined, error: { message: 'boom' }, response: { status: 500 } } })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('[data-test="load-error"]').exists()).toBe(true)
    })

    describe('challenge section', () => {
      it('shows no challenge yet when the node has none', async () => {
        routeGET({ '/content-nodes/{content_node_id}': { data: contentNodeFixture, error: undefined, response: { status: 200 } } })
        const wrapper = mountView()
        await flushPromises()

        expect(wrapper.find('[data-test="no-challenge"]').exists()).toBe(true)
      })

      it('creates a challenge from the config panel', async () => {
        routeGET({ '/content-nodes/{content_node_id}': { data: contentNodeFixture, error: undefined, response: { status: 200 } } })
        POST.mockResolvedValueOnce({
          data: {
            challenge_id: 'ch-1',
            content_node_id: 'cn-1',
            subject_tag: 's',
            pass_threshold: 70,
            shuffle_exercises: false,
            shuffle_options: false,
            created_at: '2026-01-01T00:00:00Z',
          },
          error: undefined,
          response: { status: 201 },
        })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="subject-tag"]').setValue('s')
        await wrapper.get('[data-test="save-challenge"]').trigger('click')
        await flushPromises()

        expect(POST).toHaveBeenCalledWith('/content-nodes/{content_node_id}/challenges', {
          params: { path: { content_node_id: 'cn-1' } },
          body: { subject_tag: 's', pass_threshold: 70, shuffle_exercises: false, shuffle_options: false },
        })
      })

      it('pre-fills the panel and lists linked exercises when a challenge already exists', async () => {
        routeGET({
          '/content-nodes/{content_node_id}': { data: contentNodeFixture, error: undefined, response: { status: 200 } },
          '/content-nodes/{content_node_id}/challenges': {
            data: [
              {
                challenge_id: 'ch-1',
                content_node_id: 'cn-1',
                subject_tag: 's',
                pass_threshold: 80,
                shuffle_exercises: true,
                shuffle_options: false,
                created_at: '2026-01-01T00:00:00Z',
              },
            ],
            error: undefined,
            response: { status: 200 },
          },
          '/challenges/{challenge_id}/exercises': {
            data: [{ exercise_id: 'e-1', title: 'Name the chord', exercise_type: 'text_response' }],
            error: undefined,
            response: { status: 200 },
          },
        })
        const wrapper = mountView()
        await flushPromises()

        expect((wrapper.get('[data-test="subject-tag"]').element as HTMLInputElement).value).toBe('s')
        expect((wrapper.get('[data-test="pass-threshold"]').element as HTMLInputElement).value).toBe('80')
        expect(wrapper.text()).toContain('Name the chord')
      })

      it('links a picked exercise to the challenge', async () => {
        routeGET({
          '/content-nodes/{content_node_id}': { data: contentNodeFixture, error: undefined, response: { status: 200 } },
          '/content-nodes/{content_node_id}/challenges': {
            data: [
              {
                challenge_id: 'ch-1',
                content_node_id: 'cn-1',
                subject_tag: 's',
                pass_threshold: 80,
                shuffle_exercises: false,
                shuffle_options: false,
                created_at: '2026-01-01T00:00:00Z',
              },
            ],
            error: undefined,
            response: { status: 200 },
          },
          '/exercises': {
            data: [{ exercise_id: 'e-1', title: 'Name the chord', exercise_type: 'text_response' }],
            error: undefined,
            response: { status: 200 },
          },
        })
        POST.mockResolvedValueOnce({ error: undefined, response: { status: 204 } })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="attach-exercise"]').trigger('click')
        await wrapper.get('[data-test="exercise-picker-row"]').trigger('click')
        await flushPromises()

        expect(POST).toHaveBeenCalledWith('/challenges/{challenge_id}/exercises/{exercise_id}', {
          params: { path: { challenge_id: 'ch-1', exercise_id: 'e-1' } },
        })
      })

      it('unlinks an exercise from the challenge', async () => {
        routeGET({
          '/content-nodes/{content_node_id}': { data: contentNodeFixture, error: undefined, response: { status: 200 } },
          '/content-nodes/{content_node_id}/challenges': {
            data: [
              {
                challenge_id: 'ch-1',
                content_node_id: 'cn-1',
                subject_tag: 's',
                pass_threshold: 80,
                shuffle_exercises: false,
                shuffle_options: false,
                created_at: '2026-01-01T00:00:00Z',
              },
            ],
            error: undefined,
            response: { status: 200 },
          },
          '/challenges/{challenge_id}/exercises': {
            data: [{ exercise_id: 'e-1', title: 'Name the chord', exercise_type: 'text_response' }],
            error: undefined,
            response: { status: 200 },
          },
        })
        DELETE.mockResolvedValueOnce({ error: undefined, response: { status: 204 } })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="unlink-exercise"]').trigger('click')
        await flushPromises()

        expect(DELETE).toHaveBeenCalledWith('/challenges/{challenge_id}/exercises/{exercise_id}', {
          params: { path: { challenge_id: 'ch-1', exercise_id: 'e-1' } },
        })
      })
    })
  })
})
