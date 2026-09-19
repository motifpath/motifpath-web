import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import type * as VueRouter from 'vue-router'

const POST = vi.fn()
const GET = vi.fn()
const PUT = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST, GET, PUT }, eventApi: {} }),
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

describe('ContentAuthoringView', () => {
  beforeEach(() => {
    POST.mockReset()
    GET.mockReset()
    PUT.mockReset()
    route.params = {}
    currentUser.profile.role = 'teacher'
    mockMatchMedia(false)
  })

  it('shows a permission-denied state for a student', () => {
    currentUser.profile.role = 'student'
    const wrapper = mountView()

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(true)
  })

  describe('create mode', () => {
    it('posts a CreateContentNodeRequest on save', async () => {
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
  })

  describe('edit mode', () => {
    beforeEach(() => {
      route.params = { id: 'cn-1' }
    })

    it('loads the content node by id and pre-fills the form', async () => {
      GET.mockResolvedValueOnce({
        data: {
          content_node_id: 'cn-1',
          teacher_id: 't-1',
          title: 'Alternate picking basics',
          content_type: 'article',
          classification: { skill: 'alternate-picking', concept: 'picking-technique', difficulty_level: 'advanced', review_state: 'confirmed' },
          languages: [],
          created_at: '2026-01-01T00:00:00Z',
        },
        error: undefined,
        response: { status: 200 },
      })
      const wrapper = mountView()
      await flushPromises()

      expect(GET).toHaveBeenCalledWith('/content-nodes/{content_node_id}', { params: { path: { content_node_id: 'cn-1' } } })
      expect((wrapper.get('input[placeholder="Untitled content"]').element as HTMLInputElement).value).toBe(
        'Alternate picking basics',
      )
      expect(wrapper.get('[data-test="review-state"]').text()).toContain('confirmed')
    })

    it('disables the content type toggle -- type cannot change after creation', async () => {
      GET.mockResolvedValueOnce({
        data: {
          content_node_id: 'cn-1',
          teacher_id: 't-1',
          title: 't',
          content_type: 'video',
          classification: { skill: 's', concept: 'c', difficulty_level: 'beginner', review_state: 'pending' },
          languages: [],
          created_at: '2026-01-01T00:00:00Z',
        },
        error: undefined,
        response: { status: 200 },
      })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.get('[data-test="content-type-video"]').attributes('disabled')).toBeDefined()
    })

    it('submits via PUT with the update request shape, and reports success', async () => {
      GET.mockResolvedValueOnce({
        data: {
          content_node_id: 'cn-1',
          teacher_id: 't-1',
          title: 't',
          content_type: 'video',
          classification: { skill: 's', concept: 'c', difficulty_level: 'beginner', review_state: 'pending' },
          languages: [],
          created_at: '2026-01-01T00:00:00Z',
        },
        error: undefined,
        response: { status: 200 },
      })
      PUT.mockResolvedValueOnce({
        data: {
          content_node_id: 'cn-1',
          teacher_id: 't-1',
          title: 'Updated title',
          content_type: 'video',
          classification: { skill: 's', concept: 'c', difficulty_level: 'beginner', review_state: 'pending' },
          languages: [],
          created_at: '2026-01-01T00:00:00Z',
        },
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
      GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('[data-test="load-error"]').exists()).toBe(true)
    })
  })
})
