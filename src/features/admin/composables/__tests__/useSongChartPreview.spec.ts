import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useSongChartPreview } from '@/features/admin/composables/useSongChartPreview'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { makeLearnerSongChart } from '@/shared/testUtils/songChart'

const guitar = makeFrettedInstrument({ instrument_id: 'instrument-guitar' })
const bass = makeFrettedInstrument({ instrument_id: 'instrument-bass', string_count: 4 })

function respond(preview: { data?: unknown; status: number }) {
  GET.mockImplementation((path: string) => {
    if (path === '/instruments') return Promise.resolve({ data: [bass, guitar], response: new Response(null, { status: 200 }) })
    return Promise.resolve({ data: preview.data, error: preview.status >= 400 ? {} : undefined, response: new Response(null, { status: preview.status }) })
  })
}

beforeEach(() => GET.mockReset())

describe('useSongChartPreview', () => {
  it("loads the draft's preview, with the instrument its voicings are for", async () => {
    const chart = makeLearnerSongChart({ revision_number: null })
    respond({ data: chart, status: 200 })

    const { chart: loaded, instrument, isLoading } = useSongChartPreview('chart-asa-branca')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/song-charts/{song_chart_id}/preview', { params: { path: { song_chart_id: 'chart-asa-branca' } } })
    expect(loaded.value).toEqual(chart)
    await vi.waitFor(() => expect(instrument.value).toEqual(guitar))
  })

  it('has no instrument for a chart without chords', async () => {
    respond({ data: makeLearnerSongChart({ chords: [], diagrams: [] }), status: 200 })

    const { instrument, isLoading } = useSongChartPreview('chart-asa-branca')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(instrument.value).toBeNull()
  })

  it('tells a chart that does not exist apart from another failure', async () => {
    respond({ status: 404 })

    const { notFound, error, isLoading } = useSongChartPreview('nope')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(error.value).toBe(true)
    expect(notFound.value).toBe(true)
  })
})
