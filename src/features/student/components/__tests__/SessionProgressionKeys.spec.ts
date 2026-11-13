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
  beat: ref<number | null>(null),
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
import { tourItem } from '@/features/student/testing/tourItems'
import { drillBass, drillGuitar, drillVoicings } from '@/shared/testUtils/drill'
import type { DrillChordSymbol } from '@/shared/testUtils/drill'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']
type Source = { chords: unknown[]; tempoBpm: number; noteValue: string; countInBars: number; bass: unknown }

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

type BassPattern = components['schemas']['BassPattern']

function mountTour(options: { tour?: TourState; onBass?: boolean; pattern?: BassPattern; item?: Item } = {}) {
  return mount(SessionProgressionKeys, {
    props: {
      item: options.item ?? tourItem({ onBass: options.onBass, pattern: options.pattern }),
      tempo: 84,
      noteValue: 'quarters',
      takesLeft: 3,
      takesTotal: 3,
      tour: options.tour ?? { key: 'G', speed: 84, clean: ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A'] },
      bass: options.onBass ? drillBass : null,
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

  it('on guitar, shows a chord’s card on demand, as a song chart does, on the voicing the plan gives', async () => {
    serve()
    const wrapper = mountTour()
    await flushPromises()
    expect(wrapper.find('[data-test="chord-card"]').exists()).toBe(false)

    await wrapper.findAll('[data-test="tour-bar"]')[2]!.trigger('click')

    const card = wrapper.get('[data-test="chord-card"]')
    expect(card.get('[data-test="chord-card-title"]').text()).toBe('Em')
    expect(card.findAll('[data-test="voicing-chip"]').map((chip) => chip.attributes('data-voicing-id'))).toEqual([
      drillVoicings.Em.voicing.chord_voicing_id,
    ])
    expect(card.find('[data-test="nut"]').exists()).toBe(true)
  })

  it('closes the chord’s card with its ×, back to the hint', async () => {
    serve()
    const wrapper = mountTour()
    await flushPromises()
    await wrapper.findAll('[data-test="tour-bar"]')[2]!.trigger('click')

    await wrapper.get('[data-test="chord-card-close"]').trigger('click')

    expect(wrapper.find('[data-test="chord-card"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="tour-bar"]')[2]!.attributes('aria-pressed')).toBe('false')
  })

  describe('on bass', () => {
    type BassSource = { chords: unknown[]; chordInstrument: unknown; bass: { instrument: unknown; bars: number[][] } }
    const bassSource = () => (player.source as { value: BassSource }).value

    /** The tour on bass with the pattern given, its chord G changed as `g` says. */
    function withG(pattern: BassPattern, g: Record<string, unknown>): Item {
      const item = tourItem({ onBass: true, pattern })
      const keys = item.progression_keys!.keys.map((key) =>
        key.music_key === 'G' ? { ...key, chord_tones: key.chord_tones.map((tones) => (tones.chord === 'G' ? { ...tones, ...g } : tones)) } : key,
      )
      return { ...item, progression_keys: { ...item.progression_keys!, keys } }
    }

    it('marks the chosen chord’s root, and its third and fifth above and below, at the places the plan gives', async () => {
      serve()
      const wrapper = mountTour({ onBass: true })
      await flushPromises()

      await wrapper.findAll('[data-test="tour-bar"]')[2]!.trigger('click')

      const marked = wrapper.findAll('[data-test="marked-place"]')
      expect(marked.map((place) => [place.attributes('data-role'), place.attributes('data-position'), place.attributes('data-string'), place.attributes('data-fret')])).toEqual([
        ['root', undefined, '3', '7'],
        ['third', 'above', '2', '5'],
        ['fifth', 'above', '1', '4'],
        ['third', 'below', '4', '3'],
        ['fifth', 'below', '4', '7'],
      ])
    })

    it('leaves off a tone no string reaches in the window', async () => {
      serve()
      const wrapper = mountTour({ onBass: true })
      await flushPromises()

      await wrapper.findAll('[data-test="tour-bar"]')[0]!.trigger('click')

      expect(wrapper.findAll('[data-test="marked-place"]').map((place) => place.attributes('data-position'))).toEqual([undefined, 'above', 'above'])
    })

    it('marks a chord’s seventh when the plan gives one', async () => {
      serve()
      const wrapper = mountTour({ onBass: true, item: withG('root_third_fifth_seventh', { seventh: { string: 2, fret: 4 } }) })
      await flushPromises()

      await wrapper.findAll('[data-test="tour-bar"]')[0]!.trigger('click')

      expect(wrapper.findAll('[data-test="marked-place"]').at(-1)!.attributes('aria-label')).toBe('Seventh, string 2, fret 4')
    })

    it.each([
      ['root', 'Root of each chord'],
      ['root_fifth', 'Root and 5th of each chord'],
      ['root_third_fifth_third', 'Root, 3rd, 5th and 3rd of each chord'],
      ['root_third_fifth_seventh', 'Root, 3rd, 5th and 7th of each chord'],
    ] as const)('names the pattern %s above the chart', async (pattern, line) => {
      serve()
      const wrapper = mountTour({ onBass: true, pattern })
      await flushPromises()

      expect(wrapper.get('[data-test="bass-pattern"]').text()).toBe(line)
    })

    it('sounds only the pattern’s notes in the bass’s voice, a bar a chord, and never a chord', async () => {
      serve()
      const wrapper = mountTour({ onBass: true, pattern: 'root_fifth' })
      await flushPromises()

      await wrapper.get('[data-test="start-take"]').trigger('click')

      // G D Em C in the window from the third fret, each root then its fifth above, four times through.
      const once = [
        [31, 38],
        [38, 45],
        [40, 47],
        [36, 43],
      ]
      expect(bassSource()).toMatchObject({ chords: [], chordInstrument: null, bass: { instrument: drillBass, bars: [...once, ...once, ...once, ...once] } })
    })

    it('plays root, 3rd, 5th and 3rd, or root, 3rd, 5th and 7th, a quarter each', async () => {
      serve()
      const fluent = mountTour({ onBass: true, pattern: 'root_third_fifth_third' })
      await flushPromises()
      await fluent.get('[data-test="start-take"]').trigger('click')
      // G: root G1 31, third above B1 35, fifth above D2 38.
      expect(bassSource().bass.bars[0]).toEqual([31, 35, 38, 35])
      fluent.unmount()

      const retained = mountTour({ onBass: true, item: withG('root_third_fifth_seventh', { seventh: { string: 2, fret: 4 } }) })
      await flushPromises()
      await retained.get('[data-test="start-take"]').trigger('click')
      expect(bassSource().bass.bars[0]).toEqual([31, 35, 38, 42])
    })

    it('sounds the root where the window has no place for a tone of the pattern', async () => {
      serve()
      const wrapper = mountTour({ onBass: true, item: withG('root_third_fifth_third', { third_above: null }) })
      await flushPromises()

      await wrapper.get('[data-test="start-take"]').trigger('click')

      expect(bassSource().bass.bars[0]).toEqual([31, 31, 38, 31])
    })
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
