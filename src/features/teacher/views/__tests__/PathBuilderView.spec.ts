import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import type * as VueRouter from 'vue-router'

const POST = vi.fn()
const GET = vi.fn()
const PUT = vi.fn()
const DELETE = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST, GET, PUT, DELETE }, eventApi: {} }),
}))

type LeaveGuard = () => boolean | Promise<boolean>
const route = reactive<{ params: { id?: string } }>({ params: {} })
let leaveGuard: LeaveGuard | null = null
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return {
    ...actual,
    useRoute: () => route,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    onBeforeRouteLeave: (guard: LeaveGuard) => {
      leaveGuard = guard
    },
  }
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

const toast = { success: vi.fn(), error: vi.fn() }
vi.mock('@/shared/composables/useToast', () => ({
  useToast: () => toast,
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
    attachTo: document.body,
  })
}

type Wrapper = ReturnType<typeof mountView>

function saveButton(wrapper: Wrapper) {
  return wrapper.get('[data-test="editor-app-bar-save"]')
}

function blockers(wrapper: Wrapper) {
  return wrapper.findAll('[data-test="save-blocker"]').map((item) => item.text())
}

async function publishConfirmed(wrapper: Wrapper) {
  await wrapper.get('[data-test="status-panel-primary"]').trigger('click')
  await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')
  await flushPromises()
}

async function chooseFromRowMenu(wrapper: Wrapper, row: number, label: string) {
  await wrapper.findAll('[data-test="ordered-row-menu"]')[row]!.trigger('click')
  ;[...document.querySelectorAll<HTMLButtonElement>('[data-test="ordered-row-menu-item"]')]
    .find((item) => item.textContent?.trim() === label)!
    .click()
  await flushPromises()
}

const contentNodePool = [
  { content_node_id: 'cn-1', title: 'Open position triads', content_type: 'video', latest_published_version: 1, teacher: { user_id: 't-1', display_name: 'Teacher One' }, classification: { skill: 's', concept: 'c', difficulty_level: 'beginner', review_state: 'pending' }, languages: [], created_at: '2026-01-01T00:00:00Z' },
  { content_node_id: 'cn-2', title: 'Reading the fretboard', content_type: 'article', teacher: { user_id: 't-1', display_name: 'Teacher One' }, classification: { skill: 's', concept: 'c', difficulty_level: 'beginner', review_state: 'pending' }, languages: [], created_at: '2026-01-01T00:00:00Z' },
]

const describedPath = { summary: 'Triads everywhere.', language: 'en' }

const learningPathFixture = {
  learning_path_id: 'lp-1',
  teacher: { user_id: 't-1', display_name: 'Teacher One' },
  title: 'Beginner path',
  status: 'draft',
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
    vi.clearAllMocks()
    mockMatchMedia(false)
    routeGET({})
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows a permission-denied state for a student', () => {
    currentUser.profile.role = 'student'
    const wrapper = mountView()

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(true)
  })

  describe('create mode', () => {
    it('Save with something missing saves nothing and lists what is missing', async () => {
      const wrapper = mountView()
      await flushPromises()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(POST).not.toHaveBeenCalled()
      expect(blockers(wrapper)).toEqual(['Choose a level', 'Add a lesson'])
      expect(wrapper.find('[data-field="level"]').exists()).toBe(true)
      expect(wrapper.find('[data-field="items"]').exists()).toBe(true)
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

      await saveButton(wrapper).trigger('click')
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

    it('shows no publishing controls before the path is first saved', async () => {
      currentUser.profile.role = 'admin'
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('[data-test="status-panel"]').exists()).toBe(false)
    })

    it('the list follows what is still missing, and goes once nothing is', async () => {
      const wrapper = mountView()
      await flushPromises()
      await saveButton(wrapper).trigger('click')
      await wrapper.get('[data-test="add-content-node"]').trigger('click')
      await wrapper.get('[data-test="content-node-picker-row"]').trigger('click')

      expect(blockers(wrapper)).toEqual(['Choose a level'])

      await wrapper.get('[data-test="level-option-advanced"]').trigger('click')
      expect(wrapper.find('[data-test="save-blockers"]').exists()).toBe(false)
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
      await saveButton(wrapper).trigger('click')
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
      expect(wrapper.get('[data-test="ordered-row-title"]').text()).toBe('1 · Open position triads')
      expect(wrapper.get('[data-test="ordered-row-meta"]').text()).toBe('Video · Published')
      expect(wrapper.get('[data-test="path-section-heading"]').text()).toBe('Chords')
      expect(wrapper.get('[data-test="editor-app-bar-title"]').text()).toBe('Beginner path')
      expect(wrapper.get('[data-test="editor-app-bar-saved"]').text()).toBe('Saved ✓')
      expect(wrapper.get('[data-test="level-option-intermediate"]').attributes('aria-checked')).toBe('true')
      expect(wrapper.get('[data-test="instrument-option-i-guitar"]').attributes('aria-pressed')).toBe('true')
      expect(wrapper.get('img').attributes('src')).toBe('https://cdn.test/thumbnails/path.png')
    })

    it('shows no level for a path created before levels, and asks for one before publishing', async () => {
      currentUser.profile.role = 'admin'
      const legacyPath = { ...learningPathFixture, ...describedPath, level: undefined }
      routeGET({ '/learning-paths/{learning_path_id}': { data: legacyPath, error: undefined, response: { status: 200 } } })
      PUT.mockResolvedValueOnce({ data: { ...legacyPath, level: 'beginner' }, error: undefined, response: { status: 200 } })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.findAll('[role="radio"][aria-checked="true"]')).toHaveLength(0)
      expect(wrapper.findAll('[data-test="status-panel-missing-item"]').map((item) => item.text())).toEqual(['A level'])

      await wrapper.get('[data-test="level-option-beginner"]').trigger('click')
      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(PUT.mock.calls[0]?.[1].body.level).toBe('beginner')
    })

    it('sends no thumbnail once it has been removed', async () => {
      routeGET({ '/learning-paths/{learning_path_id}': { data: learningPathFixture, error: undefined, response: { status: 200 } } })
      PUT.mockResolvedValueOnce({ data: learningPathFixture, error: undefined, response: { status: 200 } })
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-test="thumbnail-remove"]').trigger('click')
      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(PUT.mock.calls[0]?.[1].body).not.toHaveProperty('thumbnail_url')
    })

    it('submits via PUT with the replace request shape', async () => {
      routeGET({ '/learning-paths/{learning_path_id}': { data: learningPathFixture, error: undefined, response: { status: 200 } } })
      PUT.mockResolvedValueOnce({ data: learningPathFixture, error: undefined, response: { status: 200 } })
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('input[placeholder="Untitled path"]').setValue('Updated path title')
      await saveButton(wrapper).trigger('click')
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

    it('removes a lesson from the path from its menu', async () => {
      routeGET({ '/learning-paths/{learning_path_id}': { data: learningPathFixture, error: undefined, response: { status: 200 } } })
      const wrapper = mountView()
      await flushPromises()

      await chooseFromRowMenu(wrapper, 0, 'Remove from path')

      expect(wrapper.find('[data-test="ordered-row"]').exists()).toBe(false)
      expect(saveButton(wrapper).text()).toBe('Save')
    })

    it('reorders lessons from their menu', async () => {
      const twoLessons = {
        ...learningPathFixture,
        items: [
          ...learningPathFixture.items,
          { position: 2, content_node_id: 'cn-2', title: 'Reading the fretboard', content_type: 'article', section_label: 'Chords' },
        ],
      }
      routeGET({ '/learning-paths/{learning_path_id}': { data: twoLessons, error: undefined, response: { status: 200 } } })
      const wrapper = mountView()
      await flushPromises()

      await chooseFromRowMenu(wrapper, 1, 'Move up')

      expect(wrapper.findAll('[data-test="ordered-row-title"]').map((title) => title.text())).toEqual([
        '1 · Reading the fretboard',
        '2 · Open position triads',
      ])
    })

    it('pre-fills the summary and language, and sends them on save', async () => {
      const described = { ...learningPathFixture, summary: 'Triads everywhere.', language: 'en' }
      routeGET({ '/learning-paths/{learning_path_id}': { data: described, error: undefined, response: { status: 200 } } })
      PUT.mockResolvedValueOnce({ data: described, error: undefined, response: { status: 200 } })
      const wrapper = mountView()
      await flushPromises()

      expect((wrapper.get('[data-test="path-summary"]').element as HTMLTextAreaElement).value).toBe('Triads everywhere.')
      expect((wrapper.get('[data-test="path-language"]').element as HTMLSelectElement).value).toBe('en')

      await wrapper.get('[data-test="path-summary"]').setValue('  Triads up the neck.  ')
      await wrapper.get('[data-test="path-language"]').setValue('pt_BR')
      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(PUT.mock.calls[0]?.[1].body).toMatchObject({ summary: 'Triads up the neck.', language: 'pt_BR' })
    })

    it("shows the path's status, and offers a teacher no publishing control", async () => {
      routeGET({ '/learning-paths/{learning_path_id}': { data: learningPathFixture, error: undefined, response: { status: 200 } } })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Draft')
      expect(wrapper.get('[data-test="status-panel-message"]').text()).toContain('An admin publishes paths')
      expect(wrapper.find('[data-test="status-panel-primary"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="status-panel-secondary"]').exists()).toBe(false)
    })

    describe('as an admin', () => {
      beforeEach(() => {
        currentUser.profile.role = 'admin'
      })

      it('lists what a publish still needs, down to the lessons never published', async () => {
        const withDraftLesson = {
          ...learningPathFixture,
          items: [
            ...learningPathFixture.items,
            { position: 2, content_node_id: 'cn-2', title: 'Reading the fretboard', content_type: 'article' },
          ],
        }
        routeGET({ '/learning-paths/{learning_path_id}': { data: withDraftLesson, error: undefined, response: { status: 200 } } })
        const wrapper = mountView()
        await flushPromises()

        expect(wrapper.findAll('[data-test="status-panel-missing-item"]').map((item) => item.text())).toEqual([
          'A summary',
          'A language',
          'Publish the lesson “Reading the fretboard”',
        ])
        expect(wrapper.get('[data-test="status-panel-primary"]').attributes('disabled')).toBeDefined()
      })

      it('saves the path, then publishes it once confirmed', async () => {
        const ready = { ...learningPathFixture, ...describedPath }
        routeGET({ '/learning-paths/{learning_path_id}': { data: ready, error: undefined, response: { status: 200 } } })
        PUT.mockResolvedValueOnce({ data: ready, error: undefined, response: { status: 200 } })
        POST.mockResolvedValueOnce({ data: { ...ready, status: 'published' }, error: undefined, response: { status: 200 } })
        const wrapper = mountView()
        await flushPromises()

        await publishConfirmed(wrapper)

        expect(PUT).toHaveBeenCalledTimes(1)
        expect(POST).toHaveBeenCalledWith('/learning-paths/{learning_path_id}/publish', {
          params: { path: { learning_path_id: 'lp-1' } },
        })
        expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Published')
        expect(wrapper.find('[data-test="status-panel-primary"]').exists()).toBe(false)
        expect(wrapper.get('[data-test="status-panel-secondary"]').text()).toBe('Unpublish')
        expect(toast.success).toHaveBeenCalled()
      })

      it('names what a refused publish is missing, down to the unpublished lessons', async () => {
        const ready = { ...learningPathFixture, ...describedPath }
        routeGET({ '/learning-paths/{learning_path_id}': { data: ready, error: undefined, response: { status: 200 } } })
        PUT.mockResolvedValueOnce({ data: ready, error: undefined, response: { status: 200 } })
        POST.mockResolvedValueOnce({
          data: undefined,
          error: {
            message: 'learning path is not publishable',
            missing: ['summary', 'language', 'unpublished_content'],
            unpublished_content_node_ids: ['cn-1'],
          },
          response: { status: 409 },
        })
        const wrapper = mountView()
        await flushPromises()

        await publishConfirmed(wrapper)

        const missing = wrapper.get('[data-test="publish-missing"]')
        expect(missing.findAll('li').map((li) => li.text())).toEqual([
          'A summary',
          'A language',
          'Published lessons (not yet: Open position triads)',
        ])
        expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Draft')
      })

      it('clears the missing list once the path publishes', async () => {
        const ready = { ...learningPathFixture, ...describedPath }
        routeGET({ '/learning-paths/{learning_path_id}': { data: ready, error: undefined, response: { status: 200 } } })
        PUT.mockResolvedValue({ data: ready, error: undefined, response: { status: 200 } })
        POST.mockResolvedValueOnce({
          data: undefined,
          error: { message: 'learning path is not publishable', missing: ['summary'] },
          response: { status: 409 },
        })
        POST.mockResolvedValueOnce({ data: { ...learningPathFixture, status: 'published' }, error: undefined, response: { status: 200 } })
        const wrapper = mountView()
        await flushPromises()

        await publishConfirmed(wrapper)
        await publishConfirmed(wrapper)

        expect(wrapper.find('[data-test="publish-missing"]').exists()).toBe(false)
      })

      it('unpublishes a published path', async () => {
        const published = { ...learningPathFixture, status: 'published' }
        routeGET({ '/learning-paths/{learning_path_id}': { data: published, error: undefined, response: { status: 200 } } })
        POST.mockResolvedValueOnce({ data: learningPathFixture, error: undefined, response: { status: 200 } })
        PUT.mockResolvedValueOnce({ data: learningPathFixture, error: undefined, response: { status: 200 } })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="status-panel-secondary"]').trigger('click')
        await flushPromises()

        expect(POST).toHaveBeenCalledWith('/learning-paths/{learning_path_id}/unpublish', {
          params: { path: { learning_path_id: 'lp-1' } },
        })
        expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Draft')
      })

      it('keeps pending edits when unpublishing, saving them onto the draft', async () => {
        const published = { ...learningPathFixture, status: 'published', summary: 'Old summary.', language: 'en' }
        routeGET({ '/learning-paths/{learning_path_id}': { data: published, error: undefined, response: { status: 200 } } })
        POST.mockResolvedValueOnce({ data: { ...published, status: 'draft' }, error: undefined, response: { status: 200 } })
        PUT.mockResolvedValueOnce({ data: { ...published, summary: '', status: 'draft' }, error: undefined, response: { status: 200 } })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="path-summary"]').setValue('')
        await wrapper.get('[data-test="status-panel-secondary"]').trigger('click')
        await flushPromises()

        expect(POST.mock.invocationCallOrder[0]).toBeLessThan(PUT.mock.invocationCallOrder[0]!)
        expect(PUT.mock.calls[0]?.[1].body).not.toHaveProperty('summary')
        expect((wrapper.get('[data-test="path-summary"]').element as HTMLTextAreaElement).value).toBe('')
        expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Draft')
      })

      it('names what a published path would lose when a save is refused', async () => {
        const published = { ...learningPathFixture, status: 'published', summary: 'Old summary.', language: 'en' }
        routeGET({ '/learning-paths/{learning_path_id}': { data: published, error: undefined, response: { status: 200 } } })
        PUT.mockResolvedValueOnce({
          data: undefined,
          error: { message: 'the path is published and this change would leave it unpublishable', missing: ['summary'] },
          response: { status: 409 },
        })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="path-summary"]').setValue('')
        await saveButton(wrapper).trigger('click')
        await flushPromises()

        expect(wrapper.get('[data-test="publish-missing"]').findAll('li').map((li) => li.text())).toEqual(['A summary'])
        expect(toast.error).toHaveBeenCalledWith('A published path must keep everything listed below. Restore it, or unpublish the path first.')
      })

      it('reports why an unpublish was refused', async () => {
        const published = { ...learningPathFixture, status: 'published' }
        routeGET({ '/learning-paths/{learning_path_id}': { data: published, error: undefined, response: { status: 200 } } })
        POST.mockResolvedValueOnce({
          data: undefined,
          error: { message: 'learning path is used by a published course' },
          response: { status: 409 },
        })
        const wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="status-panel-secondary"]').trigger('click')
        await flushPromises()

        expect(toast.error).toHaveBeenCalledWith('Learning path is used by a published course')
        expect(wrapper.get('[data-test="status-panel-status"]').text()).toBe('Published')
      })
    })

    it('asks before leaving with unsaved changes', async () => {
      routeGET({ '/learning-paths/{learning_path_id}': { data: learningPathFixture, error: undefined, response: { status: 200 } } })
      const wrapper = mountView()
      await flushPromises()
      await wrapper.get('input[placeholder="Untitled path"]').setValue('Changed')

      const leaving = leaveGuard!()
      await flushPromises()
      expect(document.body.textContent).toContain('Leave without saving?')
      await wrapper.get('[data-test="confirm-dialog-cancel"]').trigger('click')

      expect(await leaving).toBe(false)
    })

    it('leaves at once with nothing unsaved', async () => {
      routeGET({ '/learning-paths/{learning_path_id}': { data: learningPathFixture, error: undefined, response: { status: 200 } } })
      mountView()
      await flushPromises()

      expect(await leaveGuard!()).toBe(true)
    })

    it('shows an error state with retry when loading the learning path fails', async () => {
      routeGET({ '/learning-paths/{learning_path_id}': { data: undefined, error: { message: 'boom' }, response: { status: 500 } } })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('[data-test="load-error"]').exists()).toBe(true)
    })
  })
})
