import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useFretboardMap, usePracticeOverview, usePracticeSummary } from '@/features/student/composables/usePracticeHome'

const GUITAR = '22222222-2222-4222-8222-222222222222'

describe('the practice home’s data', () => {
  beforeEach(() => {
    GET.mockReset()
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ timeZone: 'America/Sao_Paulo' } as Intl.ResolvedDateTimeFormatOptions)
  })
  afterEach(() => vi.restoreAllMocks())

  it('loads the overview for the student’s own time zone', async () => {
    const overview = { practice_days_last_7: 2, learning_days_last_7: 3, instruments: [] }
    GET.mockResolvedValueOnce({ data: overview, response: { status: 200 } })

    const { item, isLoading } = usePracticeOverview()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/students/me/practice-overview', { params: { query: { time_zone: 'America/Sao_Paulo' } } })
    expect(item.value).toEqual(overview)
  })

  it('loads an instrument’s summary for the student’s own time zone', async () => {
    GET.mockResolvedValueOnce({ data: { instrument_id: GUITAR }, response: { status: 200 } })

    const { isLoading } = usePracticeSummary(GUITAR)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/students/me/practice-summary', {
      params: { query: { instrument_id: GUITAR, time_zone: 'America/Sao_Paulo' } },
    })
  })

  it('loads the summary of the skills that suit any instrument, with no instrument asked for', async () => {
    GET.mockResolvedValueOnce({ data: { instrument_id: null }, response: { status: 200 } })

    const { isLoading } = usePracticeSummary(null)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/students/me/practice-summary', { params: { query: { time_zone: 'America/Sao_Paulo' } } })
  })

  it('loads an instrument’s fretboard map', async () => {
    GET.mockResolvedValueOnce({ data: { instrument_id: GUITAR, layout_instrument_id: GUITAR, cells: [] }, response: { status: 200 } })

    const { isLoading } = useFretboardMap(GUITAR)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/students/me/fretboard-map', { params: { query: { instrument_id: GUITAR } } })
  })

  it('reports a summary that can’t be loaded, and tries again', async () => {
    GET.mockResolvedValueOnce({ error: { message: 'boom' }, response: { status: 500 } })

    const { error, isLoading, retry } = usePracticeSummary(GUITAR)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(error.value).toBe(true)

    GET.mockResolvedValueOnce({ data: { instrument_id: GUITAR }, response: { status: 200 } })
    await retry()
    expect(error.value).toBe(false)
  })
})
