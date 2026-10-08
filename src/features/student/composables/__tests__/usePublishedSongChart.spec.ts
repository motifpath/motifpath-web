import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { usePublishedSongChart } from '@/features/student/composables/usePublishedSongChart'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { makeLearnerSongChart } from '@/shared/testUtils/songChart'

const guitar = makeFrettedInstrument({ instrument_id: 'instrument-guitar' })

function respond(chart: { data?: unknown; status: number }) {
  GET.mockImplementation((path: string) => {
    if (path === '/instruments') return Promise.resolve({ data: [guitar], response: new Response(null, { status: 200 }) })
    return Promise.resolve({ data: chart.data, error: chart.status >= 400 ? {} : undefined, response: new Response(null, { status: chart.status }) })
  })
}

beforeEach(() => GET.mockReset())

describe('usePublishedSongChart', () => {
  it('loads the published chart, with the instrument its voicings are for', async () => {
    const chart = makeLearnerSongChart()
    respond({ data: chart, status: 200 })

    const { chart: loaded, instrument, isLoading } = usePublishedSongChart('chart-asa-branca')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/song-charts/{song_chart_id}/published', { params: { path: { song_chart_id: 'chart-asa-branca' } } })
    expect(loaded.value).toEqual(chart)
    await vi.waitFor(() => expect(instrument.value).toEqual(guitar))
  })

  it("says a chart that can't be read isn't available, apart from another failure", async () => {
    respond({ status: 404 })

    const { notFound, isLoading } = usePublishedSongChart('withdrawn')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(notFound.value).toBe(true)
  })
})
