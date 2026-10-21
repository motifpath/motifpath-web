import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

// The player is driven by hand: Start takes the source it was given, and a take ends when the test says so.
const player = {
  state: ref<'idle' | 'loading' | 'playing' | 'error'>('idle'),
  currentBar: ref<number | null>(null),
  metronome: ref(false),
  toggle: vi.fn(() => {
    player.state.value = 'playing'
  }),
  stop: vi.fn(() => {
    player.state.value = 'idle'
  }),
  source: null as unknown,
}
vi.mock('@/shared/composables/useProgressionPlayback', () => ({
  useProgressionPlayback: (source: () => unknown) => {
    player.source = source
    return { ...player, status: ref('ready'), tempo: ref(0), noteValue: ref('quarters'), lengthMs: ref(0) }
  },
}))

import SessionProgressionKeys from '@/features/student/components/SessionProgressionKeys.vue'
import type { TourState } from '@/features/student/utils/keyTour'
import { i18n } from '@/i18n'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { drillGuitar, drillVoicings } from '@/shared/testUtils/drill'
import type { DrillChordSymbol } from '@/shared/testUtils/drill'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']
type Source = { chords: unknown[]; tempoBpm: number; noteValue: string; countInBars: number; bass: unknown }

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
const boxId = (symbol: DrillChordSymbol) => drillVoicings[symbol].diagram.diagram_id
const BASS = ['E1', 'A1', 'D2', 'G2']

function serve(failing: string[] = []) {
  GET.mockImplementation((path: string, init?: { params?: { path?: { diagram_id?: string } } }) => {
    if (path === '/instruments') return ok([{ ...drillGuitar, instrument_id: drillVoicings.C.diagram.instrument_id }])
    const id = init?.params?.path?.diagram_id
    const found = Object.values(drillVoicings).find(({ diagram }) => diagram.diagram_id === id)
    if (!found || failing.includes(id ?? '')) return fail()
    return ok({ ...found.diagram, chord_voicing: found.voicing })
  })
}

const TOUR_KEYS: components['schemas']['MusicKey'][] = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A', 'D', 'G']

function tourItem(onBass = false): Item {
  const charts: Record<string, DrillChordSymbol[]> = { G: ['G', 'D', 'Em', 'C'], C: ['C', 'G', 'Am', 'C'] }
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
      tour_tempo_bpm: 84,
      start_note_value: 'quarters',
      target_tempo_bpm: 100,
      min_tempo_bpm: 60,
      keys: TOUR_KEYS.map((music_key) => {
        const chart = charts[music_key] ?? []
        return {
          music_key,
          clean: false,
          chart,
          voicings: [...new Set(chart)].map((chord) => ({ chord, diagram_id: boxId(chord) })),
          chord_tones:
            onBass && music_key === 'G'
              ? [
                  { chord: 'G', root: { string: 1, fret: 0 }, third: { string: 3, fret: 2 }, fifth: { string: 2, fret: 0 } },
                  { chord: 'Em', root: { string: 4, fret: 0 }, third: { string: 1, fret: 0 }, fifth: { string: 3, fret: 2 } },
                ]
              : [],
        }
      }),
    },
  }
}

function mountTour(options: { tour?: TourState; onBass?: boolean } = {}) {
  return mount(SessionProgressionKeys, {
    props: {
      item: tourItem(options.onBass),
      tempo: 84,
      noteValue: 'quarters',
      takesLeft: 3,
      takesTotal: 3,
      tour: options.tour ?? { key: 'G', speed: 84, clean: ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A'] },
      tuning: options.onBass ? BASS : null,
    },
    global: { plugins: [i18n] },
  })
}

beforeEach(() => {
  GET.mockReset()
  clearEmbeddedDiagramCache()
  player.state.value = 'idle'
  player.currentBar.value = null
  player.toggle.mockClear()
  player.stop.mockClear()
  i18n.global.locale.value = 'en'
})

describe('SessionProgressionKeys', () => {
  it('shows the progression, its chart in the key on as chord symbols, the key line and the tempo', async () => {
    serve()
    const wrapper = mountTour()
    await flushPromises()

    expect(wrapper.text()).toContain('I–V–vi–IV (pop) in every key')
    expect(wrapper.findAll('[data-test="tour-chart"] [data-test="tour-bar"]').map((bar) => bar.text())).toEqual(['G', 'D', 'Em', 'C'])
    const keys = wrapper.findAll('[data-test="tour-key"]')
    expect(keys.map((k) => k.text())).toEqual(['A ✓', 'D', 'G', 'C ✓', 'F ✓'])
    expect(keys[2]!.attributes('aria-current')).toBe('step')
    expect(wrapper.get('[data-test="start-take"]').text()).toBe('Start take in G')
  })

  it('names the last clean key and tempo once a clean take moves the tour on', async () => {
    serve()
    const wrapper = mountTour({ tour: { key: 'C', speed: 84, clean: ['F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A', 'D'] } })
    await flushPromises()

    await wrapper.get('[data-test="start-take"]').trigger('click')
    player.state.value = 'idle'
    await flushPromises()
    await wrapper.get('[data-test="rate-clean"]').trigger('click')
    await wrapper.setProps({ tour: { key: 'G', speed: 84, clean: ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A', 'D'] } })

    expect(wrapper.get('[data-test="tour-meta"]').text()).toBe('Clean in C at 84 BPM · now in G')
  })

  it('plays a take as a bar of count-in, then the chart as many times as the plan says, at the take’s tempo', async () => {
    serve()
    const wrapper = mountTour()
    await flushPromises()

    await wrapper.get('[data-test="start-take"]').trigger('click')

    expect(player.toggle).toHaveBeenCalledTimes(1)
    const source = (player.source as { value: Source }).value
    expect(source).toMatchObject({ tempoBpm: 84, noteValue: 'quarters', countInBars: 1, bass: null })
    expect(source.chords).toHaveLength(16)
    expect(player.metronome.value).toBe(true)
  })

  it('asks for a rating when the take ends, and sends it', async () => {
    serve()
    const wrapper = mountTour()
    await flushPromises()

    await wrapper.get('[data-test="start-take"]').trigger('click')
    player.state.value = 'idle'
    await flushPromises()
    await wrapper.get('[data-test="rate-almost"]').trigger('click')

    expect(wrapper.emitted('rate')).toEqual([['almost']])
  })

  it('restarts a take without rating it', async () => {
    serve()
    const wrapper = mountTour()
    await flushPromises()

    await wrapper.get('[data-test="start-take"]').trigger('click')
    await wrapper.get('[data-test="restart-take"]').trigger('click')

    expect(player.stop).toHaveBeenCalled()
    expect(wrapper.emitted('rate')).toBeUndefined()
    expect(wrapper.find('[data-test="start-take"]').exists()).toBe(true)
  })

  it('on guitar, shows a chord’s box on demand, from the voicing the plan gives', async () => {
    serve()
    const wrapper = mountTour()
    await flushPromises()
    expect(wrapper.find('[data-test="tour-chord"]').exists()).toBe(false)

    await wrapper.findAll('[data-test="tour-bar"]')[2]!.trigger('click')

    expect(wrapper.get('[data-test="tour-chord-title"]').text()).toBe('Em')
    expect(wrapper.find('[data-test="tour-chord-box"]').exists()).toBe(true)
  })

  it('on bass, marks the chosen chord’s root, third and fifth on the board', async () => {
    serve()
    const wrapper = mountTour({ onBass: true })
    await flushPromises()

    await wrapper.findAll('[data-test="tour-bar"]')[2]!.trigger('click')

    const marked = wrapper.findAll('[data-test="marked-place"]')
    expect(marked.map((place) => [place.attributes('data-role'), place.attributes('data-string'), place.attributes('data-fret')])).toEqual([
      ['root', '4', '0'],
      ['third', '1', '0'],
      ['fifth', '3', '2'],
    ])
  })

  it('can only be skipped when its chords can’t be loaded', async () => {
    serve([boxId('Em')])
    const wrapper = mountTour()
    await flushPromises()

    expect(wrapper.find('[data-test="start-take"]').exists()).toBe(false)
    await wrapper.get('[data-test="skip-item"]').trigger('click')

    expect(wrapper.emitted('skip')).toEqual([['unavailable']])
  })
})
