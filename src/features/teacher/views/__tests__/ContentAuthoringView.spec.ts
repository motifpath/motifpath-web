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

const skillFixture = { skill_id: 's-1', name: 'alternate-picking', parent_id: null }
const conceptFixture = { concept_id: 'c-1', name: 'picking-technique', parent_id: null }

const contentNodeFixture = {
  content_node_id: 'cn-1',
  teacher_id: 't-1',
  title: 't',
  content_type: 'video',
  classification: {
    skills: [skillFixture],
    concepts: [conceptFixture],
    difficulty_level: 'beginner',
    review_state: 'pending',
  },
  languages: [],
  created_at: '2026-01-01T00:00:00Z',
}

/**
 * GET is called for several different resources once a content node id is
 * known (the node itself, its challenges, a challenge's linked exercises,
 * the exercise pool for the picker, the skill/concept trees, the timed
 * pop-up list) — routes by path so each test only needs to override what
 * it cares about, defaulting everything else to an empty/absent result.
 */
function routeGET(overrides: Record<string, unknown>) {
  GET.mockImplementation((path: string) => {
    if (path in overrides) return Promise.resolve(overrides[path])
    if (
      path === '/content-nodes/{content_node_id}/challenges' ||
      path === '/exercises' ||
      path === '/skills' ||
      path === '/concepts'
    ) {
      return Promise.resolve({ data: [], error: undefined, response: { status: 200 } })
    }
    if (path === '/content-nodes/{content_node_id}/expanded-content') {
      return Promise.resolve({ data: { items: [], total: 0 }, error: undefined, response: { status: 200 } })
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
      routeGET({ '/skills': { data: [skillFixture], error: undefined, response: { status: 200 } } })
      POST.mockResolvedValueOnce({
        data: {
          content_node_id: 'cn-1',
          teacher_id: 't-1',
          title: 'Alternate picking basics',
          content_type: 'video',
          classification: {
            skills: [skillFixture],
            concepts: [],
            difficulty_level: 'beginner',
            review_state: 'pending',
          },
          languages: [],
          created_at: '2026-01-01T00:00:00Z',
        },
        error: undefined,
        response: { status: 201 },
      })
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('input[placeholder="Untitled content"]').setValue('Alternate picking basics')
      await wrapper.get('[data-test="tree-node-checkbox"][value="s-1"]').setValue(true)
      await wrapper.get('[data-test="app-bar-save"]').trigger('click')
      await flushPromises()

      expect(POST).toHaveBeenCalledWith('/content-nodes', {
        body: {
          title: 'Alternate picking basics',
          content_type: 'video',
          classification: { skill_ids: ['s-1'], concept_ids: [], difficulty_level: 'beginner' },
          language_codes: ['any'],
        },
      })
    })

    it('shows the challenge section, with no challenge yet, once the node is saved', async () => {
      routeGET({})
      POST.mockResolvedValueOnce({ data: contentNodeFixture, error: undefined, response: { status: 201 } })
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('input[placeholder="Untitled content"]').setValue('t')
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
      routeGET({
        '/content-nodes/{content_node_id}': { data: contentNodeFixture, error: undefined, response: { status: 200 } },
        '/skills': { data: [skillFixture], error: undefined, response: { status: 200 } },
        '/concepts': { data: [conceptFixture], error: undefined, response: { status: 200 } },
      })
      const wrapper = mountView()
      await flushPromises()

      expect(GET).toHaveBeenCalledWith('/content-nodes/{content_node_id}', { params: { path: { content_node_id: 'cn-1' } } })
      expect((wrapper.get('input[placeholder="Untitled content"]').element as HTMLInputElement).value).toBe('t')
      expect(wrapper.get('[data-test="review-state"]').text()).toContain('pending')
      expect(wrapper.text()).toContain('alternate-picking')
      expect(wrapper.text()).toContain('picking-technique')
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
          classification: { skill_ids: ['s-1'], concept_ids: ['c-1'], difficulty_level: 'beginner' },
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
        routeGET({
          '/content-nodes/{content_node_id}': { data: contentNodeFixture, error: undefined, response: { status: 200 } },
          '/skills': { data: [skillFixture], error: undefined, response: { status: 200 } },
        })
        POST.mockResolvedValueOnce({
          data: {
            challenge_id: 'ch-1',
            content_node_id: 'cn-1',
            subject_skill_id: 's-1',
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

        await wrapper.get('[data-test="tree-node-radio"][value="s-1"]').setValue(true)
        await wrapper.get('[data-test="save-challenge"]').trigger('click')
        await flushPromises()

        expect(POST).toHaveBeenCalledWith('/content-nodes/{content_node_id}/challenges', {
          params: { path: { content_node_id: 'cn-1' } },
          body: {
            subject_skill_id: 's-1',
            subject_concept_id: undefined,
            pass_threshold: 70,
            shuffle_exercises: false,
            shuffle_options: false,
          },
        })
      })

      it('pre-fills the panel and lists linked exercises when a challenge already exists', async () => {
        routeGET({
          '/content-nodes/{content_node_id}': { data: contentNodeFixture, error: undefined, response: { status: 200 } },
          '/skills': { data: [skillFixture], error: undefined, response: { status: 200 } },
          '/content-nodes/{content_node_id}/challenges': {
            data: [
              {
                challenge_id: 'ch-1',
                content_node_id: 'cn-1',
                subject_skill_id: 's-1',
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

        expect((wrapper.get('[data-test="tree-node-radio"][value="s-1"]').element as HTMLInputElement).checked).toBe(true)
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
                subject_skill_id: 's-1',
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
                subject_skill_id: 's-1',
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

    describe('timed pop-ups', () => {
      it('adds a pop-up to a video content node', async () => {
        routeGET({ '/content-nodes/{content_node_id}': { data: contentNodeFixture, error: undefined, response: { status: 200 } } })
        POST.mockResolvedValueOnce({
          data: {
            expanded_content_id: 'ec-1',
            content_node_id: 'cn-1',
            content_type: 'image',
            media_url: 'https://cdn.example.com/a.png',
            trigger_at_seconds: 10,
            hide_at_seconds: 15,
            created_at: '2026-01-01T00:00:00Z',
          },
          error: undefined,
          response: { status: 201 },
        })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="new-trigger-seconds"]').setValue('10')
        await wrapper.get('[data-test="new-hide-seconds"]').setValue('15')
        await wrapper.get('[data-test="new-media-url"]').setValue('https://cdn.example.com/a.png')
        await wrapper.get('[data-test="add-timeline-item"]').trigger('click')
        await flushPromises()

        expect(POST).toHaveBeenCalledWith('/content-nodes/{content_node_id}/expanded-content', {
          params: { path: { content_node_id: 'cn-1' } },
          body: {
            content_type: 'image',
            media_url: 'https://cdn.example.com/a.png',
            trigger_at_seconds: 10,
            hide_at_seconds: 15,
          },
        })
      })

      it('shows the paragraph pop-up editor for an article content node', async () => {
        routeGET({
          '/content-nodes/{content_node_id}': {
            data: { ...contentNodeFixture, content_type: 'article' },
            error: undefined,
            response: { status: 200 },
          },
        })
        const wrapper = mountView()
        await flushPromises()

        expect(wrapper.find('[data-test="new-paragraph"]').exists()).toBe(true)
        expect(wrapper.find('[data-test="new-trigger-seconds"]').exists()).toBe(false)
      })
    })
  })
})
