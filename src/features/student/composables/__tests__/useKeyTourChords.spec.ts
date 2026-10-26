import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useKeyTourChords } from '@/features/student/composables/useKeyTourChords'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { drillGuitar, drillVoicings } from '@/shared/testUtils/drill'
import type { DrillChordSymbol } from '@/shared/testUtils/drill'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

const boxId = (symbol: DrillChordSymbol) => drillVoicings[symbol].diagram.diagram_id

function serve(failing: string[] = []) {
  GET.mockImplementation((path: string, init?: { params?: { path?: { diagram_id?: string } } }) => {
    if (path === '/instruments') return ok([{ ...drillGuitar, instrument_id: drillVoicings.C.diagram.instrument_id }])
    const id = init?.params?.path?.diagram_id
    const found = Object.values(drillVoicings).find(({ diagram }) => diagram.diagram_id === id)
    if (!found || failing.includes(id ?? '')) return fail()
    return ok({ ...found.diagram, chord_voicing: found.voicing })
  })
}

function tour(): Item {
  const key = (music_key: components['schemas']['MusicKey'], chart: DrillChordSymbol[]) => ({
    music_key,
    clean: false,
    chart,
    voicings: [...new Set(chart)].map((chord) => ({ chord, diagram_id: boxId(chord) })),
    chord_tones: [],
  })
  return {
    item_key: 'progression_keys:guitar:I-V-vi-IV',
    kind: 'progression_keys',
    rung: 'move',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 234,
    progression_keys: {
      layout_instrument_id: 'guitar',
      progression: { key: 'I-V-vi-IV', name: 'I–V–vi–IV (pop)' },
      times_through: 4,
      takes: 3,
      start_music_key: 'G',
      tour_tempo_bpm: 60,
      start_note_value: 'quarters',
      target_tempo_bpm: 100,
      min_tempo_bpm: 60,
      keys: [key('C', ['C', 'G', 'Am', 'C']), key('G', ['G', 'D', 'Em', 'C'])],
    },
  }
}

function setUp(key: string) {
  const current = ref(key)
  let chords!: ReturnType<typeof useKeyTourChords>
  mount(
    defineComponent({
      setup() {
        chords = useKeyTourChords(tour, current)
        return () => h('div')
      },
    }),
  )
  return { chords, current }
}

beforeEach(() => {
  GET.mockReset()
  clearEmbeddedDiagramCache()
})

describe('useKeyTourChords', () => {
  it('loads the voicing of every chord of the key on, and the instrument they sound on', async () => {
    serve()
    const { chords } = setUp('G')
    expect(chords.status.value).toBe('loading')

    await flushPromises()

    expect(chords.status.value).toBe('ready')
    expect(chords.key.value?.chart).toEqual(['G', 'D', 'Em', 'C'])
    expect(Object.keys(chords.diagrams.value).sort()).toEqual(['C', 'D', 'Em', 'G'])
    expect(chords.diagrams.value.Em?.chord_voicing).toBeTruthy()
    expect(chords.instrument.value?.instrument_id).toBe(drillVoicings.C.diagram.instrument_id)
  })

  it('loads the next key’s voicings when the tour moves on', async () => {
    serve()
    const { chords, current } = setUp('G')
    await flushPromises()

    current.value = 'C'
    await flushPromises()

    expect(chords.status.value).toBe('ready')
    expect(Object.keys(chords.diagrams.value).sort()).toEqual(['Am', 'C', 'G'])
  })

  it('is unavailable when a voicing can’t be loaded, so the take can’t sound', async () => {
    serve([boxId('Em')])
    const { chords } = setUp('G')

    await flushPromises()

    expect(chords.status.value).toBe('unavailable')
  })
})
