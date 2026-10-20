import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => ({ profile: { user_id: 'u-me', role: 'teacher', display_name: 'Bob Martins' } }),
}))

import AuthoringList from '@/features/teacher/components/AuthoringList.vue'
import type { AuthoringSection } from '@/features/teacher/utils/authoringListQuery'
import { overlayInPlaceKey } from '@/shared/composables/overlayInPlace'
import { mockViewport } from '@/shared/testUtils/viewport'

const GUITAR = '5e4d3c2b-1a09-4f8e-8d7c-6b5a4f3e2d1c'
const SKILL = '3f4b6f2a-8c3e-4b1a-9d2e-7a1c5f0e9b21'

const LIST_PATHS: Record<AuthoringSection, string> = {
  diagrams: '/diagrams',
  exercises: '/exercises',
  lessons: '/content-nodes',
  paths: '/learning-paths',
  courses: '/courses',
}

interface Answers {
  items?: { id: string; title: string }[]
  total?: number
  sectionTotal?: number
  fail?: boolean
}

function answer(section: AuthoringSection, answers: Answers) {
  GET.mockImplementation((path: string, options?: { params?: { query?: Record<string, unknown> } }) => {
    if (path === '/instruments') {
      return Promise.resolve({ data: [{ instrument_id: GUITAR, names: { en: 'Guitar' }, family: 'fretted' }] })
    }
    if (path === '/knowledge-nodes') {
      const kind = options?.params?.query?.kind
      return Promise.resolve({
        data: kind === 'skill' ? [{ node_id: SKILL, names: { en: 'Pentatonic shapes' }, parent_id: null, key: 'pent', instrument_ids: [] }] : [],
      })
    }
    if (path.endsWith('/creators')) return Promise.resolve({ data: [] })
    if (path === LIST_PATHS[section]) {
      if (answers.fail) return Promise.resolve({ error: { message: 'down' } })
      const limit = options?.params?.query?.limit
      if (limit === 1) return Promise.resolve({ data: { items: [], total: answers.sectionTotal ?? answers.total ?? 0, limit: 1, offset: 0 } })
      const items = answers.items ?? []
      return Promise.resolve({ data: { items, total: answers.total ?? items.length, limit: 20, offset: 0 } })
    }
    return Promise.resolve({ data: [] })
  })
}

/** The list queries sent for the section's items (not the counts). */
function listQueries(section: AuthoringSection) {
  return GET.mock.calls
    .filter(([path, options]) => path === LIST_PATHS[section] && options?.params?.query?.limit === 20)
    .map(([, options]) => options.params.query)
}

const ItemSlot = defineComponent({
  props: { item: { type: Object, required: true } },
  setup: (props) => () => h('span', { 'data-test': 'item' }, 'title' in props.item ? String(props.item.title) : ''),
})

async function mountList(section: AuthoringSection, fullPath = '/list') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/list', name: 'list', component: { template: '<div />' } }],
  })
  await router.push(fullPath)
  await router.isReady()
  const wrapper = mount(AuthoringList, {
    props: {
      section,
      title: 'Diagrams',
      newLabel: 'New diagram',
      newTo: { name: 'list' },
      editorRoute: 'list-edit',
      emptyTitle: 'No diagrams yet',
      emptyMessage: 'A diagram shows notes on the instrument.',
      loadFailedMessage: "Couldn't load your diagrams",
      grid: section === 'diagrams',
    },
    slots: { item: ({ item }: { item: object }) => h(ItemSlot, { item }) },
    global: {
      plugins: [router],
      stubs: { RouterLink: RouterLinkStub },
      provide: { [overlayInPlaceKey as symbol]: true },
    },
  })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  GET.mockReset()
  window.localStorage.clear()
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
  mockViewport(390)
})
afterEach(() => vi.unstubAllGlobals())

describe('AuthoringList', () => {
  it('shows the title, New, the count, the sort and the items', async () => {
    answer('diagrams', { items: [{ id: 'd1', title: 'A minor pentatonic' }], total: 1, sectionTotal: 1284 })

    const { wrapper } = await mountList('diagrams')

    expect(wrapper.get('h1').text()).toBe('Diagrams')
    expect(wrapper.get('[data-test="authoring-new"]').text()).toContain('New diagram')
    expect(wrapper.get('[data-test="list-count"]').text()).toBe('1 diagram')
    expect(wrapper.get('[data-test="sort-button"]').text()).toContain('Name A–Z')
    expect(wrapper.findAll('[data-test="item"]').map((item) => item.text())).toEqual(['A minor pentatonic'])
  })

  it('narrows the list by a status chip', async () => {
    answer('lessons', { items: [{ id: 'l1', title: 'Open chords' }], total: 1 })
    const { wrapper } = await mountList('lessons')

    const drafts = wrapper.findAll('[data-test="status-chips"] button').find((chip) => chip.text() === 'Drafts')!
    await drafts.trigger('click')
    await flushPromises()

    expect(listQueries('lessons').at(-1)).toEqual(expect.objectContaining({ status: 'draft' }))
  })

  it('has no status chips where the section has no publish state', async () => {
    answer('exercises', {})
    const { wrapper } = await mountList('exercises')
    expect(wrapper.find('[data-test="status-chips"]').exists()).toBe(false)
  })

  it('names the applied filters as chips, out of the section total', async () => {
    answer('diagrams', { items: [{ id: 'd1', title: 'Box 2' }], total: 46, sectionTotal: 1284 })

    const { wrapper } = await mountList('diagrams', `/list?instrument=${GUITAR}&kind=custom&root=A&skill=${SKILL}`)

    expect(wrapper.findAll('[data-test="filter-chip"]').map((chip) => chip.text())).toEqual([
      'Guitar',
      'Custom',
      'Root A',
      'Pentatonic shapes',
    ])
    expect(wrapper.get('[data-test="list-count"]').text()).toBe('46 of 1,284 diagrams')
  })

  it('removes one filter from its chip', async () => {
    answer('diagrams', { items: [], total: 0 })
    const { wrapper, router } = await mountList('diagrams', '/list?kind=custom&root=A')

    await wrapper.findAll('[data-test="filter-chip"] button')[0]!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ root: 'A' })
  })

  it('opens the filters layer on a phone and applies it with Show', async () => {
    answer('diagrams', { items: [], total: 0, sectionTotal: 10 })
    const { wrapper } = await mountList('diagrams')

    await wrapper.get('[data-test="authoring-filters-button"] button').trigger('click')
    const custom = wrapper
      .get('[data-test="filter-group-kind"]')
      .findAll('button[aria-pressed]')
      .find((chip) => chip.text() === 'Custom')!
    await custom.trigger('click')
    await wrapper.get('[data-test="filters-show"]').trigger('click')
    await flushPromises()

    expect(listQueries('diagrams').at(-1)).toEqual(expect.objectContaining({ kind: 'custom' }))
  })

  it('opens the filters as a dialog on a large computer too, leaving the list the width', async () => {
    mockViewport(1440)
    answer('diagrams', { items: [], total: 0, sectionTotal: 10 })
    const { wrapper } = await mountList('diagrams', '/list?kind=custom')

    expect(wrapper.find('[data-test="authoring-filters-panel"]').exists()).toBe(false)
    await wrapper.get('[data-test="authoring-filters-button"] button').trigger('click')
    const templates = wrapper
      .get('[data-test="filter-group-kind"]')
      .findAll('button[aria-pressed]')
      .find((chip) => chip.text() === 'Templates')!
    await templates.trigger('click')
    await wrapper.get('[data-test="filters-show"]').trigger('click')
    await flushPromises()

    expect(listQueries('diagrams').at(-1)).toEqual(expect.objectContaining({ kind: 'basic' }))
  })

  it('opens the filters as a dialog on a small computer, leaving the list the width', async () => {
    mockViewport(1024)
    answer('diagrams', { items: [], total: 0, sectionTotal: 10 })
    const { wrapper } = await mountList('diagrams', '/list?kind=custom')

    expect(wrapper.find('[data-test="authoring-filters-panel"]').exists()).toBe(false)
    const button = wrapper.get('[data-test="authoring-filters-button"] button')
    expect(button.attributes('aria-label')).toBe('Filters, 1 applied')
    await button.trigger('click')

    expect(wrapper.find('[data-test="filters-show"]').exists()).toBe(true)
  })

  it('lays the diagrams out two per row on a phone, and wider as many 168 px+ columns as fit', async () => {
    mockViewport(1280)
    answer('diagrams', { items: [{ id: 'd1', title: 'Box 1' }], total: 1 })
    const { wrapper } = await mountList('diagrams')

    const classes = wrapper.get('[data-test="authoring-items"]').classes()
    expect(classes).toContain('grid-cols-2')
    expect(classes).toContain('sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]')
  })

  it('keeps rows to a readable width, and lets the grid take the whole width', async () => {
    mockViewport(1280)
    answer('exercises', { items: [{ id: 'e1', title: 'Name the chord' }], total: 1 })
    const rows = (await mountList('exercises')).wrapper.get('[data-test="authoring-items"]')
    expect(rows.classes()).toContain('max-w-[880px]')

    answer('diagrams', { items: [{ id: 'd1', title: 'Box 1' }], total: 1 })
    const grid = (await mountList('diagrams')).wrapper.get('[data-test="authoring-items"]')
    expect(grid.classes()).not.toContain('max-w-[880px]')
  })

  it('says what the section is for when nothing is authored yet', async () => {
    answer('paths', { items: [], total: 0, sectionTotal: 0 })
    const { wrapper } = await mountList('paths')

    expect(wrapper.get('[data-test="authoring-empty"]').text()).toContain('No diagrams yet')
    expect(wrapper.get('[data-test="authoring-empty"]').text()).toContain('New diagram')
  })

  it('offers Clear filters when nothing matches, keeping the search and the chips', async () => {
    answer('diagrams', { items: [], total: 0, sectionTotal: 1284 })
    const { wrapper, router } = await mountList('diagrams', '/list?q=zzz&kind=custom')

    expect(wrapper.find('[data-test="authoring-no-matches"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="filter-chip"]').exists()).toBe(true)
    await wrapper.get('[data-test="authoring-clear-filters"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ q: 'zzz' })
  })

  it('offers Try again when the list cannot load, keeping the title and the search', async () => {
    answer('lessons', { fail: true })
    const { wrapper } = await mountList('lessons')

    expect(wrapper.get('[data-test="authoring-load-failed"]').text()).toContain("Couldn't load your diagrams")
    expect(wrapper.find('input[type="search"]').exists()).toBe(true)
    answer('lessons', { items: [{ id: 'l1', title: 'Open chords' }] })
    await wrapper.get('[data-test="authoring-load-failed"] button').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-test="item"]')).toHaveLength(1)
  })

  it('changes the sort', async () => {
    answer('exercises', {})
    const { wrapper } = await mountList('exercises')

    await wrapper.get('[data-test="sort-button"]').trigger('click')
    await wrapper.findAll('[data-test="sort-option"]')[1]!.trigger('click')
    await flushPromises()

    expect(listQueries('exercises').at(-1)).toEqual(expect.objectContaining({ sort: 'updated' }))
  })
})
