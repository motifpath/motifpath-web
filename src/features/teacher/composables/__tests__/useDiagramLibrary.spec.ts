import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useDiagramLibrary } from '@/features/teacher/composables/useDiagramLibrary'

function ok(items: unknown[], total = items.length) {
  return { data: { items, total, limit: 20, offset: 0 }, error: undefined, response: { status: 200 } }
}

function lastQuery() {
  return GET.mock.lastCall?.[1]?.params?.query
}

async function settle(isLoading: { value: boolean }) {
  await nextTick()
  await vi.waitFor(() => expect(isLoading.value).toBe(false))
}

describe('useDiagramLibrary', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockResolvedValue(ok([]))
  })
  afterEach(() => vi.useRealTimers())

  it('loads the first page of every diagram the caller can see', async () => {
    const { isLoading, hasActiveFilters } = useDiagramLibrary('u-me')
    await settle(isLoading)

    expect(GET).toHaveBeenCalledWith('/diagrams', { params: { query: { limit: 20, offset: 0 } } })
    expect(hasActiveFilters.value).toBe(false)
  })

  it('narrows to templates or to my own diagrams, without counting that as a filter', async () => {
    const { scope, hasActiveFilters, isLoading } = useDiagramLibrary('u-me')
    await settle(isLoading)

    scope.value = 'templates'
    await settle(isLoading)
    expect(lastQuery()).toEqual({ limit: 20, offset: 0, kind: 'basic' })

    scope.value = 'mine'
    await settle(isLoading)
    expect(lastQuery()).toEqual({ limit: 20, offset: 0, created_by: 'u-me' })
    expect(hasActiveFilters.value).toBe(false)
  })

  it('sends the instrument, language, skill, concept and root note filters alongside the scope', async () => {
    const { scope, filters, rootNote, hasActiveFilters, isLoading } = useDiagramLibrary('u-me')
    await settle(isLoading)

    scope.value = 'templates'
    filters.instrumentId = 'i-guitar'
    filters.language = 'pt_BR'
    filters.skillIds = ['s-1']
    filters.conceptIds = ['c-1']
    rootNote.value = ' F# '
    await settle(isLoading)

    expect(lastQuery()).toEqual({
      limit: 20,
      offset: 0,
      kind: 'basic',
      instrument_id: 'i-guitar',
      language: 'pt_BR',
      skill_id: 's-1',
      concept_id: 'c-1',
      root_note: 'F#',
    })
    expect(hasActiveFilters.value).toBe(true)
  })

  it('searches by name once typing pauses', async () => {
    vi.useFakeTimers()
    const { searchText, isLoading } = useDiagramLibrary('u-me')
    await vi.runAllTimersAsync()

    searchText.value = ' jonico '
    await vi.advanceTimersByTimeAsync(300)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(lastQuery()).toEqual({ limit: 20, offset: 0, name: 'jonico' })
  })

  it('clears the filters, the root note included, but keeps the scope', async () => {
    const { scope, filters, rootNote, clearFilters, isLoading } = useDiagramLibrary('u-me')
    await settle(isLoading)
    scope.value = 'mine'
    filters.instrumentId = 'i-guitar'
    rootNote.value = 'A'
    await settle(isLoading)

    clearFilters()
    await settle(isLoading)

    expect(lastQuery()).toEqual({ limit: 20, offset: 0, created_by: 'u-me' })
    expect(rootNote.value).toBe('')
  })
})
