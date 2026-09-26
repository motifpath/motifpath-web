import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import type * as VueRouter from 'vue-router'

const GET = vi.fn()
const POST = vi.fn()
const PUT = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET, POST, PUT }, eventApi: {} }),
}))

type LeaveGuard = () => boolean | Promise<boolean>
const route = reactive<{ params: { id?: string } }>({ params: {} })
const router = { replace: vi.fn() }
let leaveGuard: LeaveGuard | null = null
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return {
    ...actual,
    useRoute: () => route,
    useRouter: () => router,
    onBeforeRouteLeave: (guard: LeaveGuard) => {
      leaveGuard = guard
    },
  }
})

const currentUser = reactive({
  profile: { user_id: 'u-tomas', display_name: 'Tomás', role: 'teacher' as 'student' | 'teacher' | 'admin' },
})
vi.mock('@/stores/currentUser', () => ({ useCurrentUserStore: () => currentUser }))

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({
    isLoaded: { value: true },
    isSignedIn: { value: true },
    getToken: async () => 'jwt',
    signOut: vi.fn(async () => {}),
    displayInitial: { value: 'T' },
  }),
}))

import type { components } from '@/api/generated/core-domain'
import CourseBuilderView from '@/features/teacher/views/CourseBuilderView.vue'
import { useToast } from '@/shared/composables/useToast'

type Course = components['schemas']['Course']

const libraryPath = {
  learning_path_id: 'lp-1',
  title: 'Open chords',
  teacher: { user_id: 'u-tomas', display_name: 'Tomás' },
  level: 'beginner',
  instrument_ids: [],
  items: [],
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-02T12:00:00Z',
}

function course(overrides: Partial<Course> = {}): Course {
  return {
    course_id: 'c-1',
    title: 'Fingerstyle Foundations',
    summary: 'Fingerpicking from the first pattern.',
    level: 'beginner',
    language: 'en',
    status: 'draft',
    created_by: { user_id: 'u-tomas', display_name: 'Tomás' },
    created_at: '2026-09-01T00:00:00Z',
    has_unpublished_changes: false,
    instrument_ids: [],
    checkpoints: [
      { position: 1, learning_path_id: 'lp-1', effective_title: 'Open chords' },
      { position: 2, learning_path_id: 'lp-2', title: 'Stage 2', effective_title: 'Stage 2' },
    ],
    ...overrides,
  }
}

function ok(data: unknown) {
  return { data, error: undefined, response: new Response(null, { status: 200 }) }
}

function failure(status: number) {
  return { data: undefined, error: { message: 'boom' }, response: new Response(null, { status }) }
}

function routeGET(courseResult: unknown = ok(course())) {
  GET.mockImplementation((path: string, options?: { params?: { path?: { learning_path_id?: string } } }) => {
    if (path === '/courses/{course_id}') return Promise.resolve(courseResult)
    if (path === '/learning-paths/{learning_path_id}') {
      const id = options?.params?.path?.learning_path_id
      return Promise.resolve(ok({ ...libraryPath, learning_path_id: id, title: id === 'lp-2' ? 'Travis picking' : 'Open chords' }))
    }
    if (path === '/learning-paths') return Promise.resolve(ok({ items: [libraryPath], total: 1, limit: 20, offset: 0 }))
    if (path === '/courses/{course_id}/published') {
      return Promise.resolve(ok({ ...course(), status: 'published', checkpoints: [{ position: 1, title: 'Open chords', items: [] }] }))
    }
    return Promise.resolve(ok([]))
  })
}

function mockMatchMedia(): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function mountView() {
  return mount(CourseBuilderView, {
    global: { plugins: [createPinia()], stubs: { RouterLink: RouterLinkStub } },
    attachTo: document.body,
  })
}

type Wrapper = ReturnType<typeof mountView>

function saveButton(wrapper: Wrapper) {
  return wrapper.get('[data-test="app-bar-save"]')
}

async function fillNewCourse(wrapper: Wrapper) {
  await wrapper.get('[data-test="course-title"]').setValue('Fingerstyle Foundations')
  await wrapper.get('[data-test="course-summary"]').setValue('Fingerpicking from the first pattern.')
  await wrapper.get('[data-test="level-option-beginner"]').trigger('click')
  await wrapper.get('[data-test="add-checkpoint"]').trigger('click')
  await flushPromises()
  await wrapper.get('[data-test="path-picker-row"]').trigger('click')
}

describe('CourseBuilderView', () => {
  let wrapper: Wrapper | null = null

  beforeEach(() => {
    GET.mockReset()
    POST.mockReset()
    PUT.mockReset()
    router.replace.mockReset()
    leaveGuard = null
    route.params = {}
    currentUser.profile.role = 'teacher'
    useToast().clear()
    mockMatchMedia()
    routeGET()
  })
  afterEach(() => wrapper?.unmount())

  it('shows a permission notice to a student', () => {
    currentUser.profile.role = 'student'
    wrapper = mountView()

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(true)
  })

  describe('a new course', () => {
    it('keeps Save disabled until title, summary, level and a checkpoint are set', async () => {
      wrapper = mountView()
      await flushPromises()
      expect(saveButton(wrapper).attributes('disabled')).toBeDefined()

      await fillNewCourse(wrapper)

      expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('adds the picked path as a checkpoint', async () => {
      wrapper = mountView()
      await flushPromises()

      await fillNewCourse(wrapper)

      expect(wrapper.find('[data-test="path-picker-row"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="checkpoint-path-title"]').text()).toBe('Open chords')
    })

    it('creates the course, moves to its edit URL, and updates the same course on the next save', async () => {
      POST.mockResolvedValueOnce(ok(course({ course_id: 'c-new' })))
      PUT.mockResolvedValueOnce(ok(course({ course_id: 'c-new' })))
      wrapper = mountView()
      await flushPromises()
      await fillNewCourse(wrapper)

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(POST).toHaveBeenCalledWith('/courses', {
        body: {
          title: 'Fingerstyle Foundations',
          summary: 'Fingerpicking from the first pattern.',
          level: 'beginner',
          language: 'en',
          instrument_ids: [],
          checkpoints: [{ learning_path_id: 'lp-1' }],
        },
      })
      expect(router.replace).toHaveBeenCalledWith({ name: 'teacher-course-edit', params: { id: 'c-new' } })

      await wrapper.get('[data-test="course-summary"]').setValue('Changed summary.')
      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(POST).toHaveBeenCalledTimes(1)
      expect(PUT).toHaveBeenCalledWith('/courses/{course_id}', expect.objectContaining({ params: { path: { course_id: 'c-new' } } }))
    })

    it('shows no status panel until the course is saved', async () => {
      wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('[data-test="course-status"]').exists()).toBe(false)
    })

    it('keeps the form and reports the error when saving fails', async () => {
      POST.mockResolvedValueOnce({ data: undefined, error: { message: 'title must not be blank' }, response: new Response(null, { status: 400 }) })
      wrapper = mountView()
      await flushPromises()
      await fillNewCourse(wrapper)

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(router.replace).not.toHaveBeenCalled()
      expect(wrapper.get<HTMLInputElement>('[data-test="course-title"]').element.value).toBe('Fingerstyle Foundations')
      expect(useToast().toasts.value.map((toast) => toast.kind)).toEqual(['error'])
    })
  })

  describe('an existing course', () => {
    beforeEach(() => {
      route.params = { id: 'c-1' }
    })

    it('loads the live draft, looking up the title of a path whose checkpoint is retitled', async () => {
      wrapper = mountView()
      await flushPromises()

      expect(wrapper.get<HTMLInputElement>('[data-test="course-title"]').element.value).toBe('Fingerstyle Foundations')
      const titles = wrapper.findAll('[data-test="checkpoint-path-title"]').map((w) => w.text())
      expect(titles).toEqual(['Open chords', 'Travis picking'])
      expect(wrapper.findAll<HTMLInputElement>('[data-test="checkpoint-override"]')[1]!.element.value).toBe('Stage 2')
    })

    it("keeps showing a retitled checkpoint's path title after saving", async () => {
      PUT.mockResolvedValueOnce(ok(course()))
      wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-test="course-summary"]').setValue('A new summary.')
      await saveButton(wrapper).trigger('click')
      await flushPromises()

      const titles = wrapper.findAll('[data-test="checkpoint-path-title"]').map((w) => w.text())
      expect(titles).toEqual(['Open chords', 'Travis picking'])
    })

    it('saves the whole form over the course', async () => {
      PUT.mockResolvedValueOnce(ok(course()))
      wrapper = mountView()
      await flushPromises()

      await wrapper.findAll('[data-test="checkpoint-move-down"]')[0]!.trigger('click')
      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(PUT).toHaveBeenCalledWith('/courses/{course_id}', {
        params: { path: { course_id: 'c-1' } },
        body: expect.objectContaining({
          checkpoints: [{ learning_path_id: 'lp-2', title: 'Stage 2' }, { learning_path_id: 'lp-1' }],
        }),
      })
    })

    it('says so when the course does not exist, with a way back to the list', async () => {
      routeGET(failure(404))
      wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('[data-test="course-not-found"]').exists()).toBe(true)
      const notFound = wrapper.get('[data-test="course-not-found"]').element
      const notFoundLinks = wrapper.findAllComponents(RouterLinkStub).filter((link) => notFound.contains(link.element))
      expect(notFoundLinks.map((link) => link.props('to'))).toEqual([{ name: 'teacher-courses' }])
      expect(wrapper.find('[data-test="app-bar-save"]').exists()).toBe(false)
    })

    it('offers a retry when the course fails to load', async () => {
      routeGET(failure(500))
      wrapper = mountView()
      await flushPromises()
      expect(wrapper.find('[data-test="load-error"]').exists()).toBe(true)

      routeGET()
      await wrapper.get('[data-test="retry"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-test="course-title"]').exists()).toBe(true)
    })

    it('tells a teacher that an admin publishes', async () => {
      wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('[data-test="admin-publishes-note"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="publish-course"]').exists()).toBe(false)
    })

    it('shows the published outline', async () => {
      routeGET(ok(course({ status: 'published', latest_published_version: 1 })))
      wrapper = mountView()
      await flushPromises()

      await wrapper.get('[data-test="show-outline"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-test="outline-checkpoint"]').exists()).toBe(true)
    })

    describe('for an admin', () => {
      beforeEach(() => {
        currentUser.profile.role = 'admin'
      })

      it('saves, then publishes, and shows the new version', async () => {
        PUT.mockResolvedValueOnce(ok(course({ has_unpublished_changes: true })))
        POST.mockResolvedValueOnce(ok({ course_id: 'c-1', version_number: 1 }))
        wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="publish-course"]').trigger('click')
        await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')
        await flushPromises()

        expect(PUT).toHaveBeenCalled()
        expect(POST).toHaveBeenCalledWith('/courses/{course_id}/publish', { params: { path: { course_id: 'c-1' } } })
        expect(PUT.mock.invocationCallOrder[0]).toBeLessThan(POST.mock.invocationCallOrder[0]!)
        expect(wrapper.get('[data-test="course-status"]').text()).toBe('Published · v1')
        expect(wrapper.find('[data-test="unpublished-changes"]').exists()).toBe(false)
      })

      it('does not publish when saving first fails', async () => {
        PUT.mockResolvedValueOnce(failure(400))
        wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="publish-course"]').trigger('click')
        await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')
        await flushPromises()

        expect(POST).not.toHaveBeenCalled()
      })

      it('keeps Publish disabled for a published course with nothing new', async () => {
        routeGET(ok(course({ status: 'published', latest_published_version: 2 })))
        wrapper = mountView()
        await flushPromises()

        expect(wrapper.get('[data-test="publish-course"]').attributes('disabled')).toBeDefined()

        await wrapper.get('[data-test="course-summary"]').setValue('A fresher summary.')
        expect(wrapper.get('[data-test="publish-course"]').attributes('disabled')).toBeUndefined()
      })

      it('retires a published course', async () => {
        routeGET(ok(course({ status: 'published', latest_published_version: 2 })))
        POST.mockResolvedValueOnce(ok(course({ status: 'retired', latest_published_version: 2 })))
        wrapper = mountView()
        await flushPromises()

        await wrapper.get('[data-test="retire-course"]').trigger('click')
        await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')
        await flushPromises()

        expect(POST).toHaveBeenCalledWith('/courses/{course_id}/retire', { params: { path: { course_id: 'c-1' } } })
        expect(wrapper.get('[data-test="course-status"]').text()).toBe('Retired')
      })

      it('keeps Retire disabled while the form has unsaved changes, which retiring would lose', async () => {
        routeGET(ok(course({ status: 'published', latest_published_version: 2 })))
        wrapper = mountView()
        await flushPromises()
        expect(wrapper.get('[data-test="retire-course"]').attributes('disabled')).toBeUndefined()

        await wrapper.get('[data-test="course-summary"]').setValue('An unsaved summary.')

        expect(wrapper.get('[data-test="retire-course"]').attributes('disabled')).toBeDefined()
        expect(wrapper.text()).toContain('Save your changes before retiring the course.')
      })

      it('reactivates a retired course, which becomes editable again', async () => {
        routeGET(ok(course({ status: 'retired', latest_published_version: 2 })))
        POST.mockResolvedValueOnce(ok(course({ status: 'published', latest_published_version: 2 })))
        wrapper = mountView()
        await flushPromises()
        expect(wrapper.find('[data-test="app-bar-save"]').exists()).toBe(false)

        await wrapper.get('[data-test="reactivate-course"]').trigger('click')
        await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')
        await flushPromises()

        expect(POST).toHaveBeenCalledWith('/courses/{course_id}/reactivate', { params: { path: { course_id: 'c-1' } } })
        expect(wrapper.find('[data-test="app-bar-save"]').exists()).toBe(true)
        expect(wrapper.get('[data-test="course-title"]').attributes('disabled')).toBeUndefined()
      })
    })

    describe('a retired course', () => {
      beforeEach(() => routeGET(ok(course({ status: 'retired', latest_published_version: 2 }))))

      it('opens read-only, saying it is retired', async () => {
        wrapper = mountView()
        await flushPromises()

        expect(wrapper.find('[data-test="retired-notice"]').exists()).toBe(true)
        expect(wrapper.find('[data-test="app-bar-save"]').exists()).toBe(false)
        expect(wrapper.get('[data-test="course-title"]').attributes('disabled')).toBeDefined()
        expect(wrapper.get('[data-test="course-summary"]').attributes('disabled')).toBeDefined()
        expect(wrapper.find('[data-test="add-checkpoint"]').exists()).toBe(false)
        expect(wrapper.find('[data-test="checkpoint-remove"]').exists()).toBe(false)
      })
    })

    describe('leaving with unsaved changes', () => {
      it('leaves straight away when nothing changed', async () => {
        wrapper = mountView()
        await flushPromises()

        expect(await leaveGuard!()).toBe(true)
      })

      it('asks first, and stays when told to', async () => {
        wrapper = mountView()
        await flushPromises()
        await wrapper.get('[data-test="course-title"]').setValue('Changed')

        const leaving = leaveGuard!()
        await flushPromises()
        expect(wrapper.text()).toContain('Leave without saving?')
        await wrapper.get('[data-test="confirm-dialog-cancel"]').trigger('click')

        expect(await leaving).toBe(false)
      })

      it('leaves once confirmed', async () => {
        wrapper = mountView()
        await flushPromises()
        await wrapper.get('[data-test="course-title"]').setValue('Changed')

        const leaving = leaveGuard!()
        await flushPromises()
        await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')

        expect(await leaving).toBe(true)
      })

      it('asks the browser to confirm closing the page', async () => {
        wrapper = mountView()
        await flushPromises()
        await wrapper.get('[data-test="course-title"]').setValue('Changed')

        const event = new Event('beforeunload', { cancelable: true })
        window.dispatchEvent(event)

        expect(event.defaultPrevented).toBe(true)
      })
    })
  })
})
