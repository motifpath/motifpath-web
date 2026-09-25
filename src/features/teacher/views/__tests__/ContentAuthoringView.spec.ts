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

const currentUser = reactive({ profile: { user_id: 't-1', role: 'teacher' as 'student' | 'teacher' | 'admin' } })
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

import type { components } from '@/api/generated/core-domain'
import PromptEditor from '@/features/teacher/components/PromptEditor.vue'
import ContentAuthoringView from '@/features/teacher/views/ContentAuthoringView.vue'

// Already in the shape PromptEditor's Tiptap round trip emits (paragraphs gain
// a null textAlign), so it compares equal after passing through the editor.
const ARTICLE_BODY: components['schemas']['PromptDocument'] = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      attrs: { textAlign: null },
      content: [{ type: 'text', text: 'Picking starts at the wrist' }],
    },
  ],
}
const VIDEO_URL = 'https://cdn.example.com/lesson.mp4'

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
  teacher: { user_id: 't-1', display_name: 'Tina Teacher' },
  title: 't',
  content_type: 'video',
  media_url: VIDEO_URL,
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
      path === '/skills' ||
      path === '/concepts'
    ) {
      return Promise.resolve({ data: [], error: undefined, response: { status: 200 } })
    }
    if (path === '/content-nodes/{content_node_id}/expanded-content' || path === '/exercises') {
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
    currentUser.profile.user_id = 't-1'
    mockMatchMedia(false)
    routeGET({})
  })

  it('shows a permission-denied state for a student', () => {
    currentUser.profile.role = 'student'
    const wrapper = mountView()

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(true)
  })

  describe('create mode', () => {
    it('offers publishing only once the new node has been saved', async () => {
      routeGET({
        '/skills': { data: [skillFixture], error: undefined, response: { status: 200 } },
        '/concepts': { data: [conceptFixture], error: undefined, response: { status: 200 } },
        '/content-nodes/{content_node_id}/versions': { data: [], error: undefined, response: { status: 200 } },
      })
      POST.mockResolvedValueOnce({ data: contentNodeFixture, error: undefined, response: { status: 201 } })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('[data-test="publish-section"]').exists()).toBe(false)

      await wrapper.get('input[placeholder="Untitled content"]').setValue('t')
      await wrapper.get('[data-test="media-url-input"]').setValue(VIDEO_URL)
      await wrapper.findAll('[data-test="tree-open-picker"]')[0].trigger('click')
      await wrapper.get('[data-test="tree-node-checkbox"][value="s-1"]').setValue(true)
      await wrapper.findAll('[data-test="tree-open-picker"]')[1].trigger('click')
      await wrapper.get('[data-test="tree-node-checkbox"][value="c-1"]').setValue(true)
      await wrapper.get('[data-test="app-bar-save"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-test="publish-section"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="no-versions"]').exists()).toBe(true)
    })

    it('posts a CreateContentNodeRequest on save', async () => {
      routeGET({
        '/skills': { data: [skillFixture], error: undefined, response: { status: 200 } },
        '/concepts': { data: [conceptFixture], error: undefined, response: { status: 200 } },
      })
      POST.mockResolvedValueOnce({
        data: {
          content_node_id: 'cn-1',
          teacher: { user_id: 't-1', display_name: 'Tina Teacher' },
          title: 'Alternate picking basics',
          content_type: 'video',
          classification: {
            skills: [skillFixture],
            concepts: [conceptFixture],
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
      await wrapper.get('[data-test="media-url-input"]').setValue(VIDEO_URL)
      await wrapper.findAll('[data-test="tree-open-picker"]')[0].trigger('click')
      await wrapper.get('[data-test="tree-node-checkbox"][value="s-1"]').setValue(true)
      await wrapper.findAll('[data-test="tree-open-picker"]')[1].trigger('click')
      await wrapper.get('[data-test="tree-node-checkbox"][value="c-1"]').setValue(true)
      await wrapper.get('[data-test="app-bar-save"]').trigger('click')
      await flushPromises()

      expect(POST).toHaveBeenCalledWith('/content-nodes', {
        body: {
          title: 'Alternate picking basics',
          content_type: 'video',
          media_url: VIDEO_URL,
          classification: { skill_ids: ['s-1'], concept_ids: ['c-1'], difficulty_level: 'beginner' },
          language_codes: ['any'],
        },
      })
    })

    async function classify(wrapper: ReturnType<typeof mountView>) {
      await wrapper.findAll('[data-test="tree-open-picker"]')[0].trigger('click')
      await wrapper.get('[data-test="tree-node-checkbox"][value="s-1"]').setValue(true)
      await wrapper.findAll('[data-test="tree-open-picker"]')[1].trigger('click')
      await wrapper.get('[data-test="tree-node-checkbox"][value="c-1"]').setValue(true)
    }

    it('keeps Save disabled until a video has a media URL', async () => {
      routeGET({
        '/skills': { data: [skillFixture], error: undefined, response: { status: 200 } },
        '/concepts': { data: [conceptFixture], error: undefined, response: { status: 200 } },
      })
      const wrapper = mountView()
      await flushPromises()
      await classify(wrapper)

      expect(wrapper.get('[data-test="app-bar-save"]').attributes('disabled')).toBeDefined()

      await wrapper.get('[data-test="media-url-input"]').setValue(VIDEO_URL)

      expect(wrapper.get('[data-test="app-bar-save"]').attributes('disabled')).toBeUndefined()
    })

    it('flags a media URL that is not http(s) and keeps Save disabled', async () => {
      routeGET({
        '/skills': { data: [skillFixture], error: undefined, response: { status: 200 } },
        '/concepts': { data: [conceptFixture], error: undefined, response: { status: 200 } },
      })
      const wrapper = mountView()
      await flushPromises()
      await classify(wrapper)

      expect(wrapper.find('[data-test="media-url-error"]').exists()).toBe(false)

      await wrapper.get('[data-test="media-url-input"]').setValue('javascript:alert(1)')

      expect(wrapper.get('[data-test="media-url-error"]').text()).toBe('Enter a full link starting with http:// or https://')
      expect(wrapper.get('[data-test="media-url-input"]').attributes('aria-invalid')).toBe('true')
      expect(wrapper.get('[data-test="app-bar-save"]').attributes('disabled')).toBeDefined()

      await wrapper.get('[data-test="media-url-input"]').setValue(VIDEO_URL)

      expect(wrapper.find('[data-test="media-url-error"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="app-bar-save"]').attributes('disabled')).toBeUndefined()
    })

    it('swaps the media URL field for the rich-text editor when the type is article', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('[data-test="media-url-input"]').exists()).toBe(true)
      expect(wrapper.findComponent(PromptEditor).exists()).toBe(false)

      await wrapper.get('[data-test="content-type-article"]').trigger('click')

      expect(wrapper.find('[data-test="media-url-input"]').exists()).toBe(false)
      expect(wrapper.findComponent(PromptEditor).exists()).toBe(true)
    })

    it('posts an article with rich_content and no media_url', async () => {
      routeGET({
        '/skills': { data: [skillFixture], error: undefined, response: { status: 200 } },
        '/concepts': { data: [conceptFixture], error: undefined, response: { status: 200 } },
      })
      POST.mockResolvedValueOnce({
        data: { ...contentNodeFixture, content_type: 'article', media_url: undefined, rich_content: ARTICLE_BODY },
        error: undefined,
        response: { status: 201 },
      })
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('input[placeholder="Untitled content"]').setValue('Picking theory')
      await wrapper.get('[data-test="media-url-input"]').setValue(VIDEO_URL)
      await wrapper.get('[data-test="content-type-article"]').trigger('click')
      await wrapper.findComponent(PromptEditor).vm.$emit('update:modelValue', ARTICLE_BODY)
      await classify(wrapper)
      await wrapper.get('[data-test="app-bar-save"]').trigger('click')
      await flushPromises()

      expect(POST).toHaveBeenCalledWith('/content-nodes', {
        body: {
          title: 'Picking theory',
          content_type: 'article',
          rich_content: ARTICLE_BODY,
          classification: { skill_ids: ['s-1'], concept_ids: ['c-1'], difficulty_level: 'beginner' },
          language_codes: ['any'],
        },
      })
    })

    it('selects a newly created skill together with its parent chain', async () => {
      routeGET({
        '/skills': { data: [skillFixture], error: undefined, response: { status: 200 } },
        '/concepts': { data: [conceptFixture], error: undefined, response: { status: 200 } },
      })
      POST.mockResolvedValueOnce({
        data: { skill_id: 's-2', name: 'sweep-picking', parent_id: 's-1' },
        error: undefined,
        response: { status: 201 },
      })
      POST.mockResolvedValueOnce({
        data: {
          content_node_id: 'cn-1',
          teacher: { user_id: 't-1', display_name: 'Tina Teacher' },
          title: 'Sweep basics',
          content_type: 'video',
          classification: {
            skills: [skillFixture, { skill_id: 's-2', name: 'sweep-picking', parent_id: 's-1' }],
            concepts: [conceptFixture],
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

      await wrapper.get('input[placeholder="Untitled content"]').setValue('Sweep basics')
      await wrapper.get('[data-test="media-url-input"]').setValue(VIDEO_URL)
      await wrapper.findAll('[data-test="tree-open-picker"]')[0].trigger('click')
      await wrapper.get('[data-test="tree-create-name"]').setValue('sweep-picking')
      await wrapper.get('[data-test="tree-create-parent-search"]').trigger('focus')
      await wrapper.get('[data-test="tree-create-parent-option"][data-node-id="s-1"]').trigger('click')
      await wrapper.get('[data-test="tree-create-submit"]').trigger('click')
      await flushPromises()

      expect(POST).toHaveBeenNthCalledWith(1, '/skills', { body: { name: 'sweep-picking', parent_id: 's-1' } })

      await wrapper.findAll('[data-test="tree-open-picker"]')[1].trigger('click')
      await wrapper.get('[data-test="tree-node-checkbox"][value="c-1"]').setValue(true)
      await wrapper.get('[data-test="app-bar-save"]').trigger('click')
      await flushPromises()

      expect(POST).toHaveBeenNthCalledWith(2, '/content-nodes', {
        body: {
          title: 'Sweep basics',
          content_type: 'video',
          media_url: VIDEO_URL,
          classification: { skill_ids: ['s-2', 's-1'], concept_ids: ['c-1'], difficulty_level: 'beginner' },
          language_codes: ['any'],
        },
      })
    })

    it('shows the challenge section, with no challenge yet, once the node is saved', async () => {
      routeGET({
        '/skills': { data: [skillFixture], error: undefined, response: { status: 200 } },
        '/concepts': { data: [conceptFixture], error: undefined, response: { status: 200 } },
      })
      POST.mockResolvedValueOnce({ data: contentNodeFixture, error: undefined, response: { status: 201 } })
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('input[placeholder="Untitled content"]').setValue('t')
      await wrapper.get('[data-test="media-url-input"]').setValue(VIDEO_URL)
      await wrapper.findAll('[data-test="tree-open-picker"]')[0].trigger('click')
      await wrapper.get('[data-test="tree-node-checkbox"][value="s-1"]').setValue(true)
      await wrapper.findAll('[data-test="tree-open-picker"]')[1].trigger('click')
      await wrapper.get('[data-test="tree-node-checkbox"][value="c-1"]').setValue(true)
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
          media_url: VIDEO_URL,
          classification: { skill_ids: ['s-1'], concept_ids: ['c-1'], difficulty_level: 'beginner' },
          language_codes: ['any'],
        },
      })
    })

    it('pre-fills a video node\'s media URL', async () => {
      routeGET({ '/content-nodes/{content_node_id}': { data: contentNodeFixture, error: undefined, response: { status: 200 } } })
      const wrapper = mountView()
      await flushPromises()

      expect((wrapper.get('[data-test="media-url-input"]').element as HTMLInputElement).value).toBe(VIDEO_URL)
    })

    it('loads an article node\'s body into the editor and saves it back via PUT', async () => {
      const articleNode = { ...contentNodeFixture, content_type: 'article', media_url: undefined, rich_content: ARTICLE_BODY }
      routeGET({ '/content-nodes/{content_node_id}': { data: articleNode, error: undefined, response: { status: 200 } } })
      PUT.mockResolvedValueOnce({ data: articleNode, error: undefined, response: { status: 200 } })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.findComponent(PromptEditor).props('modelValue')).toEqual(ARTICLE_BODY)
      expect(wrapper.find('[data-test="media-url-input"]').exists()).toBe(false)

      await wrapper.get('[data-test="app-bar-save"]').trigger('click')
      await flushPromises()

      expect(PUT).toHaveBeenCalledWith('/content-nodes/{content_node_id}', {
        params: { path: { content_node_id: 'cn-1' } },
        body: {
          title: 't',
          rich_content: ARTICLE_BODY,
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
      const challengeFixture = {
        challenge_id: 'ch-1',
        content_node_id: 'cn-1',
        subject_skill_id: 's-1',
        pass_threshold: 80,
        shuffle_exercises: false,
        shuffle_options: false,
        created_at: '2026-01-01T00:00:00Z',
      }
      const okResponse = (data: unknown) => ({ data, error: undefined, response: { status: 200 } })
      const noContent = { error: undefined, response: { status: 204 } }
      const exerciseFixture = (id: string, title: string) => ({ exercise_id: id, title, exercise_type: 'text_response' })

      function routeChallenge(linkedExercises: ReturnType<typeof exerciseFixture>[], pool = linkedExercises) {
        routeGET({
          '/content-nodes/{content_node_id}': okResponse(contentNodeFixture),
          '/skills': okResponse([skillFixture]),
          '/content-nodes/{content_node_id}/challenges': okResponse([challengeFixture]),
          '/challenges/{challenge_id}/exercises': okResponse(linkedExercises),
          '/exercises': okResponse({ items: pool, total: pool.length, limit: 100, offset: 0 }),
        })
      }

      it('shows no challenge yet when the node has none', async () => {
        routeGET({ '/content-nodes/{content_node_id}': okResponse(contentNodeFixture) })
        const wrapper = mountView()
        await flushPromises()

        expect(wrapper.find('[data-test="no-challenge"]').exists()).toBe(true)
        expect(wrapper.find('[data-test="open-challenge-modal"]').exists()).toBe(true)
        expect(wrapper.find('[data-test="challenge-modal"]').exists()).toBe(false)
      })

      it('builds a challenge and links its exercises from the modal', async () => {
        routeGET({
          '/content-nodes/{content_node_id}': okResponse(contentNodeFixture),
          '/skills': okResponse([skillFixture]),
          '/exercises': okResponse({ items: [exerciseFixture('e-1', 'Name the chord')], total: 1, limit: 100, offset: 0 }),
        })
        POST.mockResolvedValueOnce({ data: challengeFixture, error: undefined, response: { status: 201 } }).mockResolvedValueOnce(
          noContent,
        )
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="open-challenge-modal"]').trigger('click')
        await wrapper.get('[data-test="challenge-modal"] [data-test="tree-open-picker"]').trigger('click')
        await wrapper.get('[data-test="tree-node-radio"][value="s-1"]').setValue(true)
        await wrapper.get('[data-test="attach-exercise"]').trigger('click')
        await wrapper.get('[data-test="exercise-picker-row"]').trigger('click')
        await wrapper.get('[data-test="save-challenge"]').trigger('click')
        await flushPromises()

        expect(POST.mock.calls).toEqual([
          [
            '/content-nodes/{content_node_id}/challenges',
            {
              params: { path: { content_node_id: 'cn-1' } },
              body: {
                subject_skill_id: 's-1',
                subject_concept_id: undefined,
                pass_threshold: 70,
                shuffle_exercises: false,
                shuffle_options: false,
              },
            },
          ],
          [
            '/challenges/{challenge_id}/exercises/{exercise_id}',
            { params: { path: { challenge_id: 'ch-1', exercise_id: 'e-1' } } },
          ],
        ])
        expect(wrapper.find('[data-test="challenge-modal"]').exists()).toBe(false)
      })

      it('summarizes an existing challenge and pre-fills the modal from it', async () => {
        routeChallenge([exerciseFixture('e-1', 'Name the chord')])
        const wrapper = mountView()
        await flushPromises()

        const summary = wrapper.get('[data-test="challenge-summary"]')
        expect(summary.text()).toContain('Name the chord')
        expect(summary.text()).toContain('80')

        await wrapper.get('[data-test="open-challenge-modal"]').trigger('click')
        await wrapper.get('[data-test="challenge-modal"] [data-test="tree-open-picker"]').trigger('click')
        expect((wrapper.get('[data-test="tree-node-radio"][value="s-1"]').element as HTMLInputElement).checked).toBe(true)
        expect((wrapper.get('[data-test="pass-threshold"]').element as HTMLInputElement).value).toBe('80')
      })

      it('warns when an existing challenge has no exercises', async () => {
        routeChallenge([])
        const wrapper = mountView()
        await flushPromises()

        expect(wrapper.find('[data-test="challenge-empty-warning"]').exists()).toBe(true)
      })

      it('drops an existing challenge subject once its skill is removed from classification', async () => {
        routeChallenge([exerciseFixture('e-1', 'Name the chord')])
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="tree-selected-chip-remove"]').trigger('click')
        await flushPromises()
        await wrapper.get('[data-test="open-challenge-modal"]').trigger('click')

        expect(wrapper.get('[data-test="save-challenge"]').attributes('disabled')).toBeDefined()
      })

      it('updates the challenge and links only the newly added exercise', async () => {
        routeChallenge([exerciseFixture('e-1', 'Name the chord')], [
          exerciseFixture('e-1', 'Name the chord'),
          exerciseFixture('e-2', 'Pick the diagram'),
        ])
        PUT.mockResolvedValueOnce(okResponse(challengeFixture))
        POST.mockResolvedValueOnce(noContent)
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="open-challenge-modal"]').trigger('click')
        await wrapper.get('[data-test="attach-exercise"]').trigger('click')
        await wrapper.get('[data-test="exercise-picker-row"]').trigger('click')
        await wrapper.get('[data-test="save-challenge"]').trigger('click')
        await flushPromises()

        expect(PUT).toHaveBeenCalledWith('/challenges/{challenge_id}', expect.objectContaining({ params: { path: { challenge_id: 'ch-1' } } }))
        expect(POST.mock.calls).toEqual([
          [
            '/challenges/{challenge_id}/exercises/{exercise_id}',
            { params: { path: { challenge_id: 'ch-1', exercise_id: 'e-2' } } },
          ],
        ])
      })

      it('keeps Edit challenge disabled, and shows no empty warning, until the linked exercises have loaded', async () => {
        routeChallenge([exerciseFixture('e-1', 'Name the chord')])
        let resolveExercises: (value: unknown) => void = () => {}
        const pending = new Promise((resolve) => {
          resolveExercises = resolve
        })
        const defaultGET = GET.getMockImplementation()
        GET.mockImplementation((path: string) =>
          path === '/challenges/{challenge_id}/exercises' ? pending : defaultGET?.(path),
        )
        const wrapper = mountView()
        await flushPromises()

        expect(wrapper.get('[data-test="open-challenge-modal"]').attributes('disabled')).toBeDefined()
        expect(wrapper.find('[data-test="challenge-empty-warning"]').exists()).toBe(false)

        resolveExercises(okResponse([exerciseFixture('e-1', 'Name the chord')]))
        await flushPromises()

        expect(wrapper.get('[data-test="open-challenge-modal"]').attributes('disabled')).toBeUndefined()
      })

      it('offers a retry instead of an editable empty list when the linked exercises fail to load', async () => {
        routeChallenge([exerciseFixture('e-1', 'Name the chord')])
        const defaultGET = GET.getMockImplementation()
        GET.mockImplementation((path: string) =>
          path === '/challenges/{challenge_id}/exercises'
            ? Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
            : defaultGET?.(path),
        )
        const wrapper = mountView()
        await flushPromises()

        expect(wrapper.find('[data-test="challenge-exercises-error"]').exists()).toBe(true)
        expect(wrapper.get('[data-test="open-challenge-modal"]').attributes('disabled')).toBeDefined()
        expect(wrapper.find('[data-test="challenge-empty-warning"]').exists()).toBe(false)

        GET.mockImplementation((path: string) =>
          path === '/challenges/{challenge_id}/exercises'
            ? Promise.resolve(okResponse([exerciseFixture('e-1', 'Name the chord')]))
            : defaultGET?.(path),
        )
        await wrapper.get('[data-test="challenge-exercises-retry"]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-test="challenge-exercises-error"]').exists()).toBe(false)
        expect(wrapper.get('[data-test="open-challenge-modal"]').attributes('disabled')).toBeUndefined()
      })

      describe('node challenge list', () => {
        const CHALLENGES = '/content-nodes/{content_node_id}/challenges'

        it('keeps Build challenge disabled, and says nothing about "no challenge", until the list has loaded', async () => {
          routeGET({ '/content-nodes/{content_node_id}': okResponse(contentNodeFixture) })
          const defaultGET = GET.getMockImplementation()
          let resolveChallenges: (value: unknown) => void = () => {}
          const pending = new Promise((resolve) => {
            resolveChallenges = resolve
          })
          GET.mockImplementation((path: string) => (path === CHALLENGES ? pending : defaultGET?.(path)))
          const wrapper = mountView()
          await flushPromises()

          expect(wrapper.get('[data-test="open-challenge-modal"]').attributes('disabled')).toBeDefined()
          expect(wrapper.find('[data-test="no-challenge"]').exists()).toBe(false)

          resolveChallenges(okResponse([]))
          await flushPromises()

          expect(wrapper.get('[data-test="open-challenge-modal"]').attributes('disabled')).toBeUndefined()
          expect(wrapper.find('[data-test="no-challenge"]').exists()).toBe(true)
        })

        it('offers a retry, not a Build button, when the list fails to load (it could hide an existing challenge)', async () => {
          routeGET({ '/content-nodes/{content_node_id}': okResponse(contentNodeFixture) })
          const defaultGET = GET.getMockImplementation()
          GET.mockImplementation((path: string) =>
            path === CHALLENGES
              ? Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
              : defaultGET?.(path),
          )
          const wrapper = mountView()
          await flushPromises()

          expect(wrapper.find('[data-test="challenge-list-error"]').exists()).toBe(true)
          expect(wrapper.get('[data-test="open-challenge-modal"]').attributes('disabled')).toBeDefined()
          expect(wrapper.find('[data-test="no-challenge"]').exists()).toBe(false)

          GET.mockImplementation((path: string) =>
            path === CHALLENGES ? Promise.resolve(okResponse([challengeFixture])) : defaultGET?.(path),
          )
          await wrapper.get('[data-test="challenge-list-retry"]').trigger('click')
          await flushPromises()

          expect(wrapper.find('[data-test="challenge-list-error"]').exists()).toBe(false)
          expect(wrapper.find('[data-test="challenge-summary"]').exists()).toBe(true)
        })
      })

      describe('saving again after a partial failure', () => {
        const CHALLENGES = '/content-nodes/{content_node_id}/challenges'
        const EXERCISES = '/challenges/{challenge_id}/exercises'
        const createCalls = () => POST.mock.calls.filter(([path]) => path === CHALLENGES)

        // Builds a challenge with two exercises where the second link fails: the
        // challenge and the first link exist, the modal stays open, and the
        // refresh that follows is held open until the test releases it.
        async function saveWithFailingSecondLink() {
          routeGET({
            '/content-nodes/{content_node_id}': okResponse(contentNodeFixture),
            '/skills': okResponse([skillFixture]),
            '/exercises': okResponse({ items: [exerciseFixture('e-1', 'Name the chord'), exerciseFixture('e-2', 'Pick the diagram')], total: 2, limit: 100, offset: 0 }),
          })
          const defaultGET = GET.getMockImplementation()
          let resolveRefresh: (value: unknown) => void = () => {}
          let refreshGate: Promise<unknown> | null = null
          let linkedNow = okResponse([])
          GET.mockImplementation((path: string) => {
            if (path === CHALLENGES && refreshGate) return refreshGate
            if (path === EXERCISES) return Promise.resolve(linkedNow)
            return defaultGET?.(path)
          })
          POST.mockResolvedValueOnce({ data: challengeFixture, error: undefined, response: { status: 201 } })
            .mockResolvedValueOnce(noContent)
            .mockResolvedValueOnce({ error: { message: 'boom' }, response: { status: 500 } })
          const wrapper = mountView()
          await flushPromises()

          await wrapper.get('[data-test="open-challenge-modal"]').trigger('click')
          await wrapper.get('[data-test="challenge-modal"] [data-test="tree-open-picker"]').trigger('click')
          await wrapper.get('[data-test="tree-node-radio"][value="s-1"]').setValue(true)
          await wrapper.get('[data-test="attach-exercise"]').trigger('click')
          await wrapper.get('[data-test="exercise-picker-row"]').trigger('click')
          await wrapper.get('[data-test="exercise-picker-row"]').trigger('click')

          refreshGate = new Promise((resolve) => {
            resolveRefresh = resolve
          })
          await wrapper.get('[data-test="save-challenge"]').trigger('click')
          await flushPromises()

          return {
            wrapper,
            finishRefresh: async () => {
              linkedNow = okResponse([exerciseFixture('e-1', 'Name the chord')])
              resolveRefresh(okResponse([challengeFixture]))
              await flushPromises()
            },
          }
        }

        it('keeps Save disabled while the failed save is being refreshed, so it cannot create a second challenge', async () => {
          const { wrapper } = await saveWithFailingSecondLink()

          expect(wrapper.find('[data-test="challenge-modal"]').exists()).toBe(true)
          expect(wrapper.get('[data-test="save-challenge"]').attributes('disabled')).toBeDefined()
          await wrapper.get('[data-test="save-challenge"]').trigger('click')

          expect(createCalls()).toHaveLength(1)
        })

        it('updates the challenge and links only the missing exercise once the refresh is done', async () => {
          const { wrapper, finishRefresh } = await saveWithFailingSecondLink()
          PUT.mockResolvedValueOnce(okResponse(challengeFixture))
          POST.mockResolvedValueOnce(noContent)

          await finishRefresh()
          expect(wrapper.get('[data-test="save-challenge"]').attributes('disabled')).toBeUndefined()
          await wrapper.get('[data-test="save-challenge"]').trigger('click')
          await flushPromises()

          expect(createCalls()).toHaveLength(1)
          expect(PUT).toHaveBeenCalledWith('/challenges/{challenge_id}', expect.objectContaining({ params: { path: { challenge_id: 'ch-1' } } }))
          expect(POST).toHaveBeenLastCalledWith('/challenges/{challenge_id}/exercises/{exercise_id}', {
            params: { path: { challenge_id: 'ch-1', exercise_id: 'e-2' } },
          })
        })
      })

      it('unlinks an exercise removed in the modal', async () => {
        routeChallenge([exerciseFixture('e-1', 'Name the chord'), exerciseFixture('e-2', 'Pick the diagram')])
        PUT.mockResolvedValueOnce(okResponse(challengeFixture))
        DELETE.mockResolvedValueOnce(noContent)
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="open-challenge-modal"]').trigger('click')
        await wrapper.findAll('[data-test="challenge-modal"] [data-test="unlink-exercise"]')[0]!.trigger('click')
        await wrapper.get('[data-test="save-challenge"]').trigger('click')
        await flushPromises()

        expect(DELETE).toHaveBeenCalledWith('/challenges/{challenge_id}/exercises/{exercise_id}', {
          params: { path: { challenge_id: 'ch-1', exercise_id: 'e-1' } },
        })
      })
    })

    describe('timed pop-ups', () => {
      const okResponse = (data: unknown) => ({ data, error: undefined, response: { status: 200 } })
      const popupFixture = {
        expanded_content_id: 'ec-1',
        content_node_id: 'cn-1',
        content_type: 'image',
        media_url: 'https://cdn.example.com/a.png',
        trigger_at_seconds: 10,
        hide_at_seconds: 15,
        created_at: '2026-01-01T00:00:00Z',
      }

      async function fillTiming(wrapper: ReturnType<typeof mountView>, trigger: string, hide: string) {
        await wrapper.get('[data-test="popup-trigger-seconds"]').setValue(trigger)
        await wrapper.get('[data-test="popup-hide-seconds"]').setValue(hide)
      }

      it('adds an image pop-up to a video content node through the modal', async () => {
        routeGET({ '/content-nodes/{content_node_id}': okResponse(contentNodeFixture) })
        POST.mockResolvedValueOnce({ data: popupFixture, error: undefined, response: { status: 201 } })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="add-timeline-item"]').trigger('click')
        await fillTiming(wrapper, '10', '15')
        await wrapper.get('[data-test="popup-media-url"]').setValue('https://cdn.example.com/a.png')
        await wrapper.get('[data-test="popup-save"]').trigger('click')
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
        expect(wrapper.find('[data-test="popup-modal"]').exists()).toBe(false)
      })

      it('adds a rich-text pop-up to a video content node', async () => {
        routeGET({ '/content-nodes/{content_node_id}': okResponse(contentNodeFixture) })
        POST.mockResolvedValueOnce({ data: popupFixture, error: undefined, response: { status: 201 } })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="add-timeline-item"]').trigger('click')
        await wrapper.get('[data-test="popup-kind"]').setValue('rich_text')
        await fillTiming(wrapper, '5', '9')
        const popupEditor = wrapper.get('[data-test="popup-modal"]').findComponent(PromptEditor)
        await popupEditor.vm.$emit('update:modelValue', ARTICLE_BODY)
        await wrapper.get('[data-test="popup-save"]').trigger('click')
        await flushPromises()

        expect(POST).toHaveBeenCalledWith('/content-nodes/{content_node_id}/expanded-content', {
          params: { path: { content_node_id: 'cn-1' } },
          body: { content_type: 'rich_text', rich_content: ARTICLE_BODY, trigger_at_seconds: 5, hide_at_seconds: 9 },
        })
      })

      it('edits an existing pop-up in the modal and saves it with PUT', async () => {
        routeGET({
          '/content-nodes/{content_node_id}': okResponse(contentNodeFixture),
          '/content-nodes/{content_node_id}/expanded-content': okResponse({ items: [popupFixture], total: 1 }),
        })
        PUT.mockResolvedValueOnce(okResponse(popupFixture))
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="timeline-item-edit"]').trigger('click')
        expect((wrapper.get('[data-test="popup-media-url"]').element as HTMLInputElement).value).toBe(
          'https://cdn.example.com/a.png',
        )
        await wrapper.get('[data-test="popup-hide-seconds"]').setValue('20')
        await wrapper.get('[data-test="popup-save"]').trigger('click')
        await flushPromises()

        expect(PUT).toHaveBeenCalledWith('/expanded-content/{expanded_content_id}', {
          params: { path: { expanded_content_id: 'ec-1' } },
          body: {
            content_type: 'image',
            media_url: 'https://cdn.example.com/a.png',
            trigger_at_seconds: 10,
            hide_at_seconds: 20,
          },
        })
        expect(POST).not.toHaveBeenCalled()
      })

      it('keeps the modal open with the draft intact when saving fails', async () => {
        routeGET({ '/content-nodes/{content_node_id}': okResponse(contentNodeFixture) })
        POST.mockResolvedValueOnce({ data: undefined, error: { message: 'nope' }, response: { status: 400 } })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="add-timeline-item"]').trigger('click')
        await fillTiming(wrapper, '10', '15')
        await wrapper.get('[data-test="popup-media-url"]').setValue('https://cdn.example.com/a.png')
        await wrapper.get('[data-test="popup-save"]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-test="popup-modal"]').exists()).toBe(true)
        expect((wrapper.get('[data-test="popup-media-url"]').element as HTMLInputElement).value).toBe(
          'https://cdn.example.com/a.png',
        )
      })

      it('shows the paragraph pop-up editor and paragraph timing for an article content node', async () => {
        routeGET({
          '/content-nodes/{content_node_id}': okResponse({ ...contentNodeFixture, content_type: 'article' }),
        })
        const wrapper = mountView()
        await flushPromises()

        expect(wrapper.find('[data-test="add-timeline-item"]').exists()).toBe(false)
        await wrapper.get('[data-test="add-popup-item"]').trigger('click')

        expect(wrapper.find('[data-test="popup-paragraph"]').exists()).toBe(true)
        expect(wrapper.find('[data-test="popup-trigger-seconds"]').exists()).toBe(false)
      })
    })

    describe('publishing and version history', () => {
      const okResponse = (data: unknown) => ({ data, error: undefined, response: { status: 200 } })
      const versionFixture = (version_number: number, title_snapshot: string) => ({
        content_node_id: 'cn-1',
        version_number,
        title_snapshot,
        classification_snapshot: contentNodeFixture.classification,
        media_url_snapshot: VIDEO_URL,
        languages_snapshot: [],
        published_at: '2026-09-20T14:30:00Z',
      })

      it('says a never-published node has no versions yet', async () => {
        routeGET({
          '/content-nodes/{content_node_id}': okResponse({ ...contentNodeFixture, latest_published_version: null }),
          '/content-nodes/{content_node_id}/versions': okResponse([]),
        })
        const wrapper = mountView()
        await flushPromises()

        expect(wrapper.get('[data-test="publish-status"]').text()).toContain('Not published yet')
        expect(wrapper.find('[data-test="no-versions"]').exists()).toBe(true)
      })

      it('lists the published versions newest first, with the latest one called out', async () => {
        routeGET({
          '/content-nodes/{content_node_id}': okResponse({ ...contentNodeFixture, latest_published_version: 2 }),
          '/content-nodes/{content_node_id}/versions': okResponse([
            versionFixture(2, 'Second title'),
            versionFixture(1, 'First title'),
          ]),
        })
        const wrapper = mountView()
        await flushPromises()

        expect(GET).toHaveBeenCalledWith('/content-nodes/{content_node_id}/versions', {
          params: { path: { content_node_id: 'cn-1' } },
        })
        expect(wrapper.get('[data-test="publish-status"]').text()).toMatch(/version 2/i)
        const rows = wrapper.findAll('[data-test="version-row"]')
        expect(rows).toHaveLength(2)
        expect(rows[0].text()).toContain('Version 2')
        expect(rows[0].text()).toContain('Second title')
        expect(rows[0].text()).toContain('Latest')
        expect(rows[1].text()).toContain('Version 1')
        expect(rows[1].text()).toContain('First title')
        expect(rows[1].text()).not.toContain('Latest')
      })

      it('saves the current draft, then publishes it and refreshes the history', async () => {
        let versions = [versionFixture(1, 't')]
        GET.mockImplementation((path: string) => {
          if (path === '/content-nodes/{content_node_id}') {
            return Promise.resolve(okResponse({ ...contentNodeFixture, latest_published_version: 1 }))
          }
          if (path === '/content-nodes/{content_node_id}/versions') return Promise.resolve(okResponse(versions))
          if (path === '/exercises' || path === '/content-nodes/{content_node_id}/expanded-content') {
            return Promise.resolve(okResponse({ items: [], total: 0 }))
          }
          return Promise.resolve(okResponse([]))
        })
        PUT.mockResolvedValueOnce(okResponse({ ...contentNodeFixture, title: 'Edited title', latest_published_version: 1 }))
        POST.mockImplementationOnce(() => {
          versions = [versionFixture(2, 'Edited title'), ...versions]
          return Promise.resolve({ data: versions[0], error: undefined, response: { status: 201 } })
        })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('input[placeholder="Untitled content"]').setValue('Edited title')
        await wrapper.get('[data-test="publish-button"]').trigger('click')
        await flushPromises()

        expect(PUT).toHaveBeenCalledWith(
          '/content-nodes/{content_node_id}',
          expect.objectContaining({ body: expect.objectContaining({ title: 'Edited title' }) }),
        )
        expect(POST).toHaveBeenCalledWith('/content-nodes/{content_node_id}/publish', {
          params: { path: { content_node_id: 'cn-1' } },
        })
        expect(PUT.mock.invocationCallOrder[0]).toBeLessThan(POST.mock.invocationCallOrder[0])
        expect(wrapper.get('[data-test="publish-status"]').text()).toMatch(/version 2/i)
        const rows = wrapper.findAll('[data-test="version-row"]')
        expect(rows).toHaveLength(2)
        expect(rows[0].text()).toContain('Edited title')
      })

      it('keeps the node\'s languages when publishing saves the draft first', async () => {
        routeGET({
          '/content-nodes/{content_node_id}': okResponse({
            ...contentNodeFixture,
            languages: [{ code: 'pt_BR', name: 'Portuguese (Brazil)' }],
          }),
          '/content-nodes/{content_node_id}/versions': okResponse([]),
        })
        PUT.mockResolvedValueOnce(okResponse(contentNodeFixture))
        POST.mockResolvedValueOnce({ data: versionFixture(1, 't'), error: undefined, response: { status: 201 } })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="publish-button"]').trigger('click')
        await flushPromises()

        expect(PUT).toHaveBeenCalledWith(
          '/content-nodes/{content_node_id}',
          expect.objectContaining({ body: expect.objectContaining({ language_codes: ['pt_BR'] }) }),
        )
      })

      it('does not publish when saving the draft fails', async () => {
        routeGET({
          '/content-nodes/{content_node_id}': okResponse(contentNodeFixture),
          '/content-nodes/{content_node_id}/versions': okResponse([]),
        })
        PUT.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="publish-button"]').trigger('click')
        await flushPromises()

        expect(PUT).toHaveBeenCalled()
        expect(POST).not.toHaveBeenCalled()
      })

      it('disables publishing while the draft could not be saved', async () => {
        routeGET({
          '/content-nodes/{content_node_id}': okResponse(contentNodeFixture),
          '/content-nodes/{content_node_id}/versions': okResponse([]),
        })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="media-url-input"]').setValue('not a url')

        expect(wrapper.get('[data-test="publish-button"]').attributes('disabled')).toBeDefined()
      })

      it('shows a retryable error when the history fails to load', async () => {
        routeGET({
          '/content-nodes/{content_node_id}': okResponse(contentNodeFixture),
          '/content-nodes/{content_node_id}/versions': { data: undefined, error: { message: 'boom' }, response: { status: 500 } },
        })
        const wrapper = mountView()
        await flushPromises()

        expect(wrapper.find('[data-test="versions-error"]').exists()).toBe(true)

        routeGET({
          '/content-nodes/{content_node_id}': okResponse(contentNodeFixture),
          '/content-nodes/{content_node_id}/versions': okResponse([versionFixture(1, 't')]),
        })
        await wrapper.get('[data-test="versions-retry"]').trigger('click')
        await flushPromises()

        expect(wrapper.findAll('[data-test="version-row"]')).toHaveLength(1)
      })

      it('hides publishing from a teacher who did not create the node, without fetching its history', async () => {
        currentUser.profile.user_id = 't-other'
        routeGET({ '/content-nodes/{content_node_id}': okResponse(contentNodeFixture) })
        const wrapper = mountView()
        await flushPromises()

        expect(wrapper.find('[data-test="publish-section"]').exists()).toBe(false)
        expect(GET).not.toHaveBeenCalledWith('/content-nodes/{content_node_id}/versions', expect.anything())
      })

      it('shows publishing to an admin on any node', async () => {
        currentUser.profile.user_id = 'admin-1'
        currentUser.profile.role = 'admin'
        routeGET({
          '/content-nodes/{content_node_id}': okResponse(contentNodeFixture),
          '/content-nodes/{content_node_id}/versions': okResponse([]),
        })
        const wrapper = mountView()
        await flushPromises()

        expect(wrapper.find('[data-test="publish-section"]').exists()).toBe(true)
      })
    })
  })
})
