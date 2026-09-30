import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { usePathCatalog } from '@/features/student/composables/usePathCatalog'
import { i18n } from '@/i18n'

function ok(items: unknown[], total = items.length) {
  return { data: { items, total, limit: 20, offset: 0 }, error: undefined, response: { status: 200 } }
}

function lastQuery() {
  return GET.mock.lastCall?.[1]?.params?.query
}

describe('usePathCatalog', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockResolvedValue(ok([]))
  })
  afterEach(() => {
    i18n.global.locale.value = 'en'
  })

  it("loads the first page of published paths in the learner's language", async () => {
    const paths = [{ learning_path_id: 'lp-1', title: 'Open chords' }]
    GET.mockResolvedValueOnce(ok(paths, 1))

    const { paths: result, total, isLoading } = usePathCatalog()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/catalog/paths', { params: { query: { limit: 20, offset: 0, language: 'en' } } })
    expect(result.value).toEqual(paths)
    expect(total.value).toBe(1)
  })

  it('uses a saved catalog state instead of the locale defaults', async () => {
    const { filters, searchText, isLoading } = usePathCatalog({
      language: null,
      levels: ['beginner'],
      searchText: 'chords',
    })
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(filters.language).toBeNull()
    expect(searchText.value).toBe('chords')
    expect(lastQuery()).toEqual({ limit: 20, offset: 0, q: 'chords', levels: ['beginner'] })
  })

  it('reloads from the first page with every filter it is given', async () => {
    const { filters, isLoading } = usePathCatalog()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    filters.language = null
    filters.instrumentId = 'i-guitar'
    filters.teacher = { user_id: 't-1', display_name: 'Bob Martins' }
    filters.skillIds = ['s-1']
    filters.conceptIds = ['c-1']
    await nextTick()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(lastQuery()).toEqual({
      limit: 20,
      offset: 0,
      instrument_id: 'i-guitar',
      created_by: 't-1',
      skill_ids: ['s-1'],
      concept_ids: ['c-1'],
    })
  })
})
