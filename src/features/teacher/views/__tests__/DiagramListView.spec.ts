import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

const currentUser = reactive({
  profile: { user_id: 'u-teacher', role: 'teacher' as 'student' | 'teacher' | 'admin' },
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

import DiagramListView from '@/features/teacher/views/DiagramListView.vue'

function page(items: unknown[], total = items.length) {
  return { data: { items, total, limit: 20, offset: 0 }, error: undefined, response: { status: 200 } }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

function mountView() {
  return mount(DiagramListView, {
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub },
    },
  })
}

describe('DiagramListView', () => {
  beforeEach(() => {
    GET.mockReset()
    currentUser.profile.role = 'teacher'
    mockMatchMedia(false)
  })

  it('shows a permission-denied state for a student instead of the list', () => {
    currentUser.profile.role = 'student'
    GET.mockResolvedValueOnce(page([]))
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

    GET.mockResolvedValueOnce(page([]))
    await wrapper.get('[data-test="retry"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
  })

  it('shows an empty state with a link to create the first diagram', async () => {
    GET.mockResolvedValueOnce(page([]))
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    const link = wrapper.get('[data-test="empty"]').findComponent(RouterLinkStub)
    expect(link.props('to')).toEqual({ name: 'teacher-diagram-new' })
  })

  it('lists diagrams, each linking to its edit route', async () => {
    GET.mockResolvedValueOnce(
      page([
        { diagram_id: 'd-1', name: 'Minor Pentatonic — Position 1', instrument_id: 'i-1', kind: 'custom', created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' } },
        { diagram_id: 'd-2', name: 'C Major Scale', instrument_id: 'i-1', kind: 'basic', created_by: { user_id: 'u-admin', display_name: 'Marina Alves' } },
      ]),
    )
    const wrapper = mountView()
    await flush()

    expect(wrapper.text()).toContain('Minor Pentatonic — Position 1')
    expect(wrapper.text()).toContain('C Major Scale')

    const links = wrapper
      .findAllComponents(RouterLinkStub)
      .filter((l) => typeof l.props('to') === 'object' && (l.props('to') as { name?: string }).name === 'teacher-diagram-edit')
    expect(links.map((l) => l.props('to'))).toEqual(
      expect.arrayContaining([
        { name: 'teacher-diagram-edit', params: { id: 'd-1' } },
        { name: 'teacher-diagram-edit', params: { id: 'd-2' } },
      ]),
    )
  })

  it('marks basic diagrams as templates, and only them', async () => {
    GET.mockResolvedValueOnce(
      page([
        { diagram_id: 'd-1', name: 'Mine', kind: 'custom', created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' } },
        { diagram_id: 'd-2', name: 'Template', kind: 'basic', created_by: { user_id: 'u-admin', display_name: 'Marina Alves' } },
      ]),
    )
    const wrapper = mountView()
    await flush()

    const rows = wrapper.findAll('[data-test="diagram-row"]')
    expect(rows[0]!.find('[data-test="template-badge"]').exists()).toBe(false)
    expect(rows[1]!.find('[data-test="template-badge"]').text()).toBe('Template')
  })

  it('narrows the list to templates, then to my own diagrams, and back to all', async () => {
    GET.mockResolvedValue(page([]))
    const wrapper = mountView()
    await flush()
    expect(GET).toHaveBeenLastCalledWith('/diagrams', { params: { query: { limit: 20, offset: 0 } } })
    expect(wrapper.get('[data-test="filter-all"]').attributes('aria-pressed')).toBe('true')

    await wrapper.get('[data-test="filter-templates"]').trigger('click')
    await flush()
    expect(GET).toHaveBeenLastCalledWith('/diagrams', { params: { query: { limit: 20, offset: 0, kind: 'basic' } } })
    expect(wrapper.get('[data-test="filter-templates"]').attributes('aria-pressed')).toBe('true')

    await wrapper.get('[data-test="filter-mine"]').trigger('click')
    await flush()
    expect(GET).toHaveBeenLastCalledWith('/diagrams', { params: { query: { limit: 20, offset: 0, created_by: 'u-teacher' } } })

    await wrapper.get('[data-test="filter-all"]').trigger('click')
    await flush()
    expect(GET).toHaveBeenLastCalledWith('/diagrams', { params: { query: { limit: 20, offset: 0 } } })
  })

  it('shows how many diagrams are loaded and loads the next page on request', async () => {
    GET.mockResolvedValueOnce(page([{ diagram_id: 'd-1', name: 'A', kind: 'basic', created_by: { user_id: 'u-admin', display_name: 'Marina Alves' } }], 2))
    const wrapper = mountView()
    await flush()

    expect(wrapper.text()).toContain('Showing 1 of 2')

    GET.mockResolvedValueOnce({
      data: { items: [{ diagram_id: 'd-2', name: 'B', kind: 'basic', created_by: { user_id: 'u-admin', display_name: 'Marina Alves' } }], total: 2, limit: 20, offset: 1 },
      error: undefined,
      response: { status: 200 },
    })
    await wrapper.get('[data-test="load-more"]').trigger('click')
    await flush()

    expect(GET).toHaveBeenLastCalledWith('/diagrams', { params: { query: { limit: 20, offset: 1 } } })
    expect(wrapper.findAll('[data-test="diagram-row"]')).toHaveLength(2)
  })
})
