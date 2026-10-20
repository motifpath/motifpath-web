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

import { i18n } from '@/i18n'
import DiagramListView from '@/features/teacher/views/DiagramListView.vue'
import type { components } from '@/api/generated/core-domain'
import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { mockViewport } from '@/shared/testUtils/viewport'

type Diagram = components['schemas']['Diagram']

function diagram(id: string, overrides: Partial<Diagram> = {}): Diagram {
  return makeFrettedDiagram({ diagram_id: id, names: { en: `Diagram ${id}` }, kind: 'custom', root_note: 'A', ...overrides })
}

function answer(diagrams: unknown[]) {
  GET.mockImplementation((path: string) => {
    if (path === '/diagrams') return Promise.resolve({ data: { items: diagrams, total: diagrams.length, limit: 20, offset: 0 } })
    if (path === '/instruments') {
      return Promise.resolve({ data: [makeFrettedInstrument({ names: { en: 'Guitar', pt_BR: 'Violão' } })] })
    }
    return Promise.resolve({ data: [] })
  })
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/teach/diagrams', name: 'teacher-diagrams', component: DiagramListView }],
  })
  await router.push('/teach/diagrams')
  await router.isReady()
  const wrapper = mount(DiagramListView, {
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

describe('DiagramListView', () => {
  it('shows a permission-denied state for a student instead of the list', async () => {
    currentUser.profile.role = 'student'
    answer([])
    const wrapper = await mountView()

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(true)
  })

  it('offers a new diagram from the title', async () => {
    answer([diagram('d-1')])
    const wrapper = await mountView()

    expect(wrapper.get('h1').text()).toBe('Diagrams')
    expect(wrapper.get('[data-test="authoring-new"]').findComponent(RouterLinkStub).props('to')).toEqual({
      name: 'teacher-diagram-new',
    })
  })

  it('shows each diagram as a tile with its board, opening its editor', async () => {
    answer([diagram('d-1'), diagram('d-2')])
    const wrapper = await mountView()

    expect(wrapper.findAll('[data-test="diagram-thumbnail"]')).toHaveLength(2)
    const links = wrapper
      .findAllComponents(RouterLinkStub)
      .map((link) => link.props('to'))
      .filter((to) => typeof to === 'object' && 'name' in to && to.name === 'teacher-diagram-edit')
    expect(links).toEqual([
      { name: 'teacher-diagram-edit', params: { id: 'd-1' } },
      { name: 'teacher-diagram-edit', params: { id: 'd-2' } },
    ])
  })

  it('names each diagram in the viewer’s language, with its instrument and root', async () => {
    i18n.global.locale.value = 'pt-BR'
    try {
      answer([diagram('d-1', { names: { en: 'Major scale', pt_BR: 'Escala maior' } })])
      const wrapper = await mountView()

      expect(wrapper.get('[data-test="diagram-tile-name"]').text()).toBe('Escala maior')
      expect(wrapper.get('[data-test="diagram-tile-meta"]').text()).toBe('Violão · Nota A')
    } finally {
      i18n.global.locale.value = 'en'
    }
  })

  it('leaves the root out of the meta line of a diagram without one', async () => {
    answer([diagram('d-1', { root_note: null })])
    const wrapper = await mountView()

    expect(wrapper.get('[data-test="diagram-tile-meta"]').text()).toBe('Guitar')
  })

  it('marks templates, and only them', async () => {
    answer([diagram('d-1', { kind: 'basic' }), diagram('d-2')])
    const wrapper = await mountView()

    expect(wrapper.findAll('[data-test="template-badge"]')).toHaveLength(1)
  })

  it('offers the Diagrams filters', async () => {
    answer([])
    const wrapper = await mountView()

    await wrapper.get('[data-test="authoring-filters-button"] button').trigger('click')

    expect(wrapper.find('[data-test="filter-group-root"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="filter-group-kind"]').exists()).toBe(true)
  })
})
