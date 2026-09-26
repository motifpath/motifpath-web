import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

const currentUser = reactive({
  profile: { user_id: 'u-me', display_name: 'Me Teacher', role: 'teacher' },
})
vi.mock('@/stores/currentUser', () => ({ useCurrentUserStore: () => currentUser }))

import LearningPathPickerModal from '@/features/teacher/components/LearningPathPickerModal.vue'

const paths = [
  {
    learning_path_id: 'lp-1',
    title: 'Open chords',
    teacher: { user_id: 'u-tomas', display_name: 'Tomás Ribeiro' },
    level: 'beginner',
    instrument_ids: ['i-guitar'],
    thumbnail_url: 'https://cdn.test/thumbnails/lp-1.png',
    items: [],
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-20T12:00:00Z',
  },
  {
    learning_path_id: 'lp-2',
    title: 'Reading rhythm',
    teacher: { user_id: 'u-me', display_name: 'Me Teacher' },
    instrument_ids: [],
    items: [],
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-02T00:00:00Z',
  },
]
const instruments = [{ instrument_id: 'i-guitar', names: { en: 'Guitar' }, languages: ['en'] }]

function routeGET(pathsResult: unknown = { data: { items: paths, total: 3, limit: 20, offset: 0 }, error: undefined }) {
  GET.mockImplementation((path: string) => {
    if (path === '/learning-paths') return Promise.resolve(pathsResult)
    if (path === '/instruments') return Promise.resolve({ data: instruments, error: undefined })
    return Promise.resolve({ data: [], error: undefined })
  })
}

function lastLibraryQuery() {
  return GET.mock.calls.filter(([path]) => path === '/learning-paths').at(-1)?.[1]?.params?.query
}

async function mountPicker() {
  const wrapper = mount(LearningPathPickerModal, { props: { open: true } })
  await flushPromises()
  return wrapper
}

describe('LearningPathPickerModal', () => {
  beforeEach(() => {
    GET.mockReset()
    routeGET()
  })

  it("lists the library with each path's thumbnail, title, author, level, instruments and last update", async () => {
    const wrapper = await mountPicker()

    const rows = wrapper.findAll('[data-test="path-picker-row"]')
    expect(rows).toHaveLength(2)
    const first = rows[0]!
    expect(first.get('img').attributes('src')).toBe('https://cdn.test/thumbnails/lp-1.png')
    expect(first.text()).toContain('Open chords')
    expect(first.text()).toContain('Tomás Ribeiro')
    expect(first.text()).toContain('Beginner')
    expect(first.text()).toContain('Guitar')
    expect(first.text()).toContain('Updated Aug 20, 2026')
  })

  it('marks a path with no level, and one for every instrument', async () => {
    const wrapper = await mountPicker()

    const second = wrapper.findAll('[data-test="path-picker-row"]')[1]!
    expect(second.text()).toContain('No level')
    expect(second.text()).toContain('Every instrument')
    expect(second.find('[data-test="thumbnail-placeholder"]').exists()).toBe(true)
  })

  it('emits the path picked', async () => {
    const wrapper = await mountPicker()

    await wrapper.findAll('[data-test="path-picker-row"]')[0]!.trigger('click')

    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ learning_path_id: 'lp-1', title: 'Open chords' })
  })

  it('sorts by title, or by most recent update', async () => {
    const wrapper = await mountPicker()
    expect(lastLibraryQuery()).toMatchObject({ sort: 'title' })

    await wrapper.get('[data-test="path-sort-updated"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="path-sort-updated"]').attributes('aria-pressed')).toBe('true')
    expect(lastLibraryQuery()).toMatchObject({ sort: 'updated' })
  })

  it("narrows to the teacher's own paths", async () => {
    const wrapper = await mountPicker()

    await wrapper.get('[data-test="path-only-mine"]').setValue(true)
    await flushPromises()

    expect(lastLibraryQuery()).toMatchObject({ created_by: 'u-me' })
  })

  it('filters by level and instrument', async () => {
    const wrapper = await mountPicker()

    await wrapper.get('[data-test="level-filter-advanced"]').trigger('click')
    await wrapper.get('[data-test="instrument-filter"]').setValue('i-guitar')
    await flushPromises()

    expect(lastLibraryQuery()).toMatchObject({ levels: ['advanced'], instrument_id: 'i-guitar' })
  })

  it('loads more paths', async () => {
    const wrapper = await mountPicker()

    await wrapper.get('[data-test="load-more"]').trigger('click')
    await flushPromises()

    expect(lastLibraryQuery()).toMatchObject({ offset: 2 })
  })

  it('shows an error with a retry when the library fails to load', async () => {
    routeGET({ data: undefined, error: { message: 'boom' } })
    const wrapper = await mountPicker()

    expect(wrapper.find('[data-test="path-picker-error"]').exists()).toBe(true)

    routeGET()
    await wrapper.get('[data-test="path-picker-error"] button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-test="path-picker-row"]')).toHaveLength(2)
  })

  it('says when no path matches', async () => {
    routeGET({ data: { items: [], total: 0, limit: 20, offset: 0 }, error: undefined })
    const wrapper = await mountPicker()

    expect(wrapper.find('[data-test="path-picker-empty"]').exists()).toBe(true)
  })

  it('closes', async () => {
    const wrapper = await mountPicker()

    await wrapper.get('[data-test="close-modal"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
