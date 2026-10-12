import { flushPromises } from '@vue/test-utils'
import { effectScope, nextTick, reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useDiscoverCatalog } from '@/features/student/composables/useDiscoverCatalog'
import type { DiscoverSegment } from '@/features/student/composables/useDiscoverState'
import type { DiscoverState } from '@/features/student/utils/discoverQuery'

const BRUNO = { user_id: 'u-bruno', display_name: 'Bruno' }
const courseEntry = { course_id: 'c-blues', title: 'Blues basics', level: 'beginner', language: 'en', created_by: BRUNO, instrument_ids: [], checkpoint_count: 4, lesson_count: 44 }
const pathEntry = { learning_path_id: 'lp-shuffle', title: 'Blues shuffle', level: 'beginner', language: 'en', created_by: BRUNO, instrument_ids: [], lesson_count: 9 }

function page(items: unknown[], total = items.length) {
  return { data: { items, total, limit: 20, offset: 0 } }
}

/** Answers each catalog with the given pages, whatever the query. */
function answer(courses: ReturnType<typeof page>, paths: ReturnType<typeof page>) {
  GET.mockImplementation((url: string) => Promise.resolve(url === '/catalog/courses' ? courses : paths))
}

function setup(segmentValue: DiscoverSegment, initial: Partial<DiscoverState> = {}) {
  const segment = ref<DiscoverSegment>(segmentValue)
  const state = reactive<DiscoverState>({ q: '', filters: { levels: [], skills: [], concepts: [] }, ...initial })
  const scope = effectScope()
  const catalog = scope.run(() => useDiscoverCatalog(segment, state))!
  return { segment, state, catalog }
}

beforeEach(() => GET.mockReset())

describe('useDiscoverCatalog', () => {
  it('lists the segment’s catalog, asking with the search and filters', async () => {
    answer(page([courseEntry]), page([]))
    const { catalog } = setup('courses', { q: 'blues', filters: { levels: ['beginner'], skills: [], concepts: [] } })
    await flushPromises()

    expect(GET).toHaveBeenCalledWith('/catalog/courses', {
      params: { query: { limit: 20, offset: 0, q: 'blues', levels: ['beginner'] } },
    })
    expect(catalog.items.value.map((item) => item.title)).toEqual(['Blues basics'])
    expect(catalog.total.value).toBe(1)
  })

  it('lists paths on the Paths segment', async () => {
    answer(page([courseEntry]), page([pathEntry]))
    const { catalog } = setup('paths')
    await flushPromises()

    expect(catalog.items.value).toEqual([expect.objectContaining({ kind: 'path', title: 'Blues shuffle' })])
  })

  it('lists the other catalog when the segment changes', async () => {
    answer(page([courseEntry]), page([pathEntry]))
    const { segment, catalog } = setup('courses')
    await flushPromises()

    segment.value = 'paths'
    await nextTick()
    await flushPromises()

    expect(catalog.items.value.map((item) => item.kind)).toEqual(['path'])
  })

  it('asks again when the filters change', async () => {
    answer(page([courseEntry]), page([]))
    const { state } = setup('courses')
    await flushPromises()
    GET.mockClear()

    state.filters = { levels: [], teacher: 'u-bruno', skills: [], concepts: [] }
    await nextTick()
    await flushPromises()

    expect(GET).toHaveBeenCalledWith('/catalog/courses', {
      params: { query: { limit: 20, offset: 0, created_by: 'u-bruno' } },
    })
  })

  it('counts the other segment’s matches when this one has none', async () => {
    answer(page([]), page([pathEntry], 2))
    const { catalog } = setup('courses', { q: 'shuffle' })
    await flushPromises()

    expect(GET).toHaveBeenCalledWith('/catalog/paths', { params: { query: { limit: 1, offset: 0, q: 'shuffle' } } })
    expect(catalog.otherCount.value).toBe(2)
  })

  it('does not count the other segment while this one has matches', async () => {
    answer(page([courseEntry]), page([pathEntry]))
    const { catalog } = setup('courses', { q: 'blues' })
    await flushPromises()

    expect(GET).not.toHaveBeenCalledWith('/catalog/paths', expect.anything())
    expect(catalog.otherCount.value).toBeNull()
  })

  it('reports a catalog that fails to load', async () => {
    GET.mockResolvedValue({ error: { message: 'down' } })
    const { catalog } = setup('courses')
    await flushPromises()

    expect(catalog.error.value).toBe(true)
  })
})
