import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

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

const instruments = [{ instrument_id: 'i-guitar', names: { en: 'Guitar' }, languages: ['en'] }]

import PathListView from '@/features/teacher/views/PathListView.vue'

function mountView() {
  return mount(PathListView, {
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub },
    },
  })
}

describe('PathListView', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockImplementation((requestPath: string) =>
      Promise.resolve(
        requestPath === '/instruments'
          ? { data: instruments, error: undefined, response: { status: 200 } }
          : { data: { items: [], total: 0, limit: 20, offset: 0 }, error: undefined, response: { status: 200 } },
      ),
    )
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

  it('shows an empty state with a link to create the first learning path', async () => {
    GET.mockResolvedValueOnce({ data: { items: [], total: 0, limit: 20, offset: 0 }, error: undefined, response: { status: 200 } })
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    const link = wrapper.get('[data-test="empty"]').findComponent(RouterLinkStub)
    expect(link.props('to')).toEqual({ name: 'teacher-path-new' })
  })

  it('lists learning paths, each linking to its edit route', async () => {
    GET.mockResolvedValueOnce({
      data: {
        items: [
          { learning_path_id: 'lp-1', instrument_ids: [], title: 'Beginner guitar', items: [{}, {}] },
          { learning_path_id: 'lp-2', instrument_ids: [], title: 'Advanced theory', items: [{}] },
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

    expect(wrapper.text()).toContain('Beginner guitar')
    expect(wrapper.text()).toContain('Advanced theory')

    const links = wrapper
      .findAllComponents(RouterLinkStub)
      .filter((l) => typeof l.props('to') === 'object' && (l.props('to') as { name?: string }).name === 'teacher-path-edit')
    expect(links.map((l) => l.props('to'))).toEqual(
      expect.arrayContaining([
        { name: 'teacher-path-edit', params: { id: 'lp-1' } },
        { name: 'teacher-path-edit', params: { id: 'lp-2' } },
      ]),
    )
  })

  it('loads the next page when the teacher asks for more', async () => {
    GET.mockResolvedValueOnce({
      data: { items: [{ learning_path_id: 'lp-1', instrument_ids: [], title: 'Beginner blues', items: [], created_at: '2026-01-01T00:00:00Z' }], total: 2, limit: 20, offset: 0 },
      error: undefined,
      response: { status: 200 },
    })
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toContain('Showing 1 of 2')

    GET.mockResolvedValueOnce({
      data: { items: [{ learning_path_id: 'lp-2', instrument_ids: [], title: 'Jazz voicings', items: [], created_at: '2026-01-01T00:00:00Z' }], total: 2, limit: 20, offset: 1 },
      error: undefined,
      response: { status: 200 },
    })
    await wrapper.get('[data-test="load-more"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(GET).toHaveBeenLastCalledWith('/learning-paths', { params: { query: { limit: 20, offset: 1 } } })
    expect(wrapper.findAll('[data-test="learning-path-row"]')).toHaveLength(2)
    expect(wrapper.find('[data-test="load-more"]').exists()).toBe(false)
  })
  it("shows each item's thumbnail, or a placeholder, and its instruments", async () => {
    GET.mockResolvedValueOnce({
      data: {
        items: [
          { learning_path_id: 'lp-1', title: 'Beginner guitar', level: 'beginner', instrument_ids: ['i-guitar'], thumbnail_url: 'https://cdn.test/thumbnails/lp-1.png', items: [] },
          { learning_path_id: 'lp-2', title: 'Reading rhythm', instrument_ids: [], items: [] },
        ],
        total: 2,
        limit: 20,
        offset: 0,
      },
      error: undefined,
      response: { status: 200 },
    })
    const wrapper = mountView()
    await flushPromises()

    const rows = wrapper.findAll('[data-test="learning-path-row"]')
    expect(rows[0]!.get('img').attributes('src')).toMatch(/^https:\/\/cdn.test\/thumbnails\//)
    expect(rows[0]!.text()).toContain('Guitar')
    expect(rows[1]!.find('[data-test="thumbnail-placeholder"]').exists()).toBe(true)
    expect(rows[1]!.text()).toContain('Every instrument')
  })

  it('filters by instrument, and says when nothing matches', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('[data-test="instrument-filter"]').setValue('i-guitar')
    await flushPromises()

    expect(GET).toHaveBeenLastCalledWith('/learning-paths', { params: { query: { limit: 20, offset: 0, instrument_id: 'i-guitar' } } })
    expect(wrapper.find('[data-test="no-matches"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)
  })
})
