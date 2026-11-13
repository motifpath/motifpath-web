import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

const metronomeOn = ref(false)
const metronomeSettings: { bpm: number }[] = []
const startMetronome = vi.fn((settings: { bpm: number }) => {
  metronomeOn.value = settings.bpm > 0
})
const stopMetronome = vi.fn(() => {
  metronomeOn.value = false
})
const toggleMetronome = vi.fn(() => {
  metronomeOn.value = !metronomeOn.value
})
vi.mock('@/shared/composables/useMetronome', () => ({
  useMetronome: (settings: () => { bpm: number }) => {
    metronomeSettings.push(settings())
    return { on: metronomeOn, beat: ref(null), start: () => startMetronome(settings()), stop: stopMetronome, toggle: toggleMetronome }
  },
}))

// The bass's player is driven by hand: Start takes the source it was given.
const player = {
  state: ref<'idle' | 'loading' | 'playing' | 'error'>('idle'),
  currentBar: ref<number | null>(null),
  beat: ref<number | null>(null),
  metronome: ref(false),
  /** How far into the roots the audio is, as the player tells it: null while it loads. */
  musicMs: vi.fn<() => number | null>(() => null),
  toggle: vi.fn(() => {
    player.state.value = 'playing'
  }),
  stop: vi.fn(() => {
    player.state.value = 'idle'
  }),
  source: null as unknown,
}
vi.mock('@/shared/composables/useProgressionPlayback', () => ({
  useProgressionPlayback: (source: unknown) => {
    player.source = source
    return { ...player, status: ref('ready'), tempo: ref(0), noteValue: ref('quarters'), lengthMs: ref(0) }
  },
}))

import SessionChordChange from '@/features/student/components/SessionChordChange.vue'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { drillBass, drillGuitar, drillVoicings } from '@/shared/testUtils/drill'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']
type Take = components['schemas']['ChangeTake']

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

const AM = drillVoicings.Am.diagram.diagram_id
const C = drillVoicings.C.diagram.diagram_id
const BASS = 'instrument-bass'

function serve(options: { failing?: boolean } = {}) {
  GET.mockImplementation((path: string, init?: { params?: { path?: { diagram_id?: string } } }) => {
    if (path === '/instruments') return ok([{ ...drillGuitar, instrument_id: drillVoicings.C.diagram.instrument_id }])
    const found = Object.values(drillVoicings).find(({ diagram }) => diagram.diagram_id === init?.params?.path?.diagram_id)
    if (!found || options.failing) return fail()
    return ok({ ...found.diagram, chord_voicing: found.voicing })
  })
}

function take(fields: Partial<Take> = {}): Take {
  return { cycles: 10, start_tempo_bpm: 60, target_tempo_bpm: 60, best_clean_tempo_bpm: null, ...fields }
}

const base = { rung: 'play_in_time', reason: 'new', node_id: null, level: 'new', estimated_seconds: 90 } as const

function chordChange(fields: Partial<Take> = {}): Item {
  return {
    ...base,
    item_key: `chord_change:${AM}:${C}`,
    kind: 'chord_change',
    chord_change: { from_diagram_id: AM, to_diagram_id: C, from_chord_symbol: 'Am', to_chord_symbol: 'C', take: take(fields) },
  }
}

function rootChange(fields: Partial<Take> = {}): Item {
  return {
    ...base,
    item_key: `root_change:${BASS}:Am:C`,
    kind: 'root_change',
    root_change: {
      layout_instrument_id: BASS,
      from_chord_symbol: 'Am',
      to_chord_symbol: 'C',
      from_root: { string: 3, fret: 0 },
      to_root: { string: 3, fret: 3 },
      window_start_fret: 0,
      take: take(fields),
    },
  }
}

async function mountItem(item: Item, props: Record<string, unknown> = {}) {
  const wrapper = mount(SessionChordChange, { props: { item, ...props }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

async function setTempo(wrapper: Awaited<ReturnType<typeof mountItem>>, bpm: number) {
  const slider = wrapper.get<HTMLInputElement>('[data-test="tempo-slider"]')
  slider.element.value = String(bpm)
  await slider.trigger('change')
}

/** Starts the take and plays it through: a bar of count-in at the tempo, then ten cycles, 20 beats. */
async function playTheTake(wrapper: Awaited<ReturnType<typeof mountItem>>, bpm: number) {
  await wrapper.get('[data-test="start-take"]').trigger('click')
  await vi.advanceTimersByTimeAsync(((4 + 20) * 60_000) / bpm + 500)
}

/** Starts a bass take and lets the player sound it through: its clock past the twentieth beat at 60 BPM. */
async function playTheBassTake(wrapper: Awaited<ReturnType<typeof mountItem>>) {
  await wrapper.get('[data-test="start-take"]').trigger('click')
  player.musicMs.mockReturnValue(20_000)
  await vi.advanceTimersByTimeAsync(100)
}

const shares = (wrapper: Awaited<ReturnType<typeof mountItem>>) => wrapper.findAll('[data-test="clean-share"]')

describe('SessionChordChange', () => {
  enableAutoUnmount(afterEach)

  beforeEach(() => {
    vi.useFakeTimers()
    clearEmbeddedDiagramCache()
    GET.mockReset()
    serve()
    metronomeOn.value = false
    metronomeSettings.length = 0
    startMetronome.mockClear()
    stopMetronome.mockClear()
    toggleMetronome.mockClear()
    player.state.value = 'idle'
    player.metronome.value = false
    player.toggle.mockClear()
    player.stop.mockClear()
    player.musicMs.mockReset()
    player.musicMs.mockReturnValue(null)
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  describe('ready', () => {
    it('draws both chord boxes with their names', async () => {
      const wrapper = await mountItem(chordChange())

      expect(wrapper.get('[data-test="item-title"]').text()).toBe('Am and C, back and forth')
      const chords = wrapper.findAll('[data-test="pair-chord"]')
      expect(chords.map((chord) => chord.get('[data-test="pair-chord-name"]').text())).toEqual(['Am', 'C'])
      expect(chords.map((chord) => chord.get('svg').attributes('aria-label'))).toEqual(['Am', 'C'])
    })

    it('shows the metronome row at the plan’s tempo, the best clean tempo marked, and ten cycles to play', async () => {
      const wrapper = await mountItem(chordChange({ start_tempo_bpm: 45, best_clean_tempo_bpm: 50 }))

      expect(wrapper.find('[data-test="metronome-row"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-test="beat-dot"]')).toHaveLength(4)
      expect(wrapper.get('[data-test="tempo-value"]').text()).toContain('45')
      expect(wrapper.find('[data-test="tempo-tick-best"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="tempo-tick-goal"]').exists()).toBe(true)
      expect(wrapper.get('[data-test="change-meta"]').text()).toBe('10 cycles · change on every beat')
      expect(wrapper.get('[data-test="cycles-left"]').text()).toBe('10')
    })

    it('marks no best clean tempo before the first clean take', async () => {
      const wrapper = await mountItem(chordChange())

      expect(wrapper.find('[data-test="tempo-tick-best"]').exists()).toBe(false)
    })

    it('lets the metronome tick while the tempo is tried, at the tempo set', async () => {
      const wrapper = await mountItem(chordChange({ start_tempo_bpm: 45 }))

      await wrapper.get('[data-test="metronome"]').trigger('click')
      expect(toggleMetronome).toHaveBeenCalledTimes(1)
      expect(metronomeSettings[0]).toMatchObject({ bpm: 45, beats: 4 })
    })

    it('sends nothing before the take is over', async () => {
      const wrapper = await mountItem(chordChange())

      await setTempo(wrapper, 50)
      await wrapper.get('[data-test="start-take"]').trigger('click')
      await vi.advanceTimersByTimeAsync(10_000)

      expect(wrapper.emitted('save')).toBeUndefined()
    })
  })

  describe('the take', () => {
    it('counts in one bar at the tempo, then counts the cycles down from 10, two beats each', async () => {
      const wrapper = await mountItem(chordChange({ start_tempo_bpm: 60 }))

      await wrapper.get('[data-test="start-take"]').trigger('click')
      expect(startMetronome).toHaveBeenCalledWith(expect.objectContaining({ bpm: 60, beats: 4 }))
      expect(wrapper.get('[data-test="count-in"]').text()).toBe('4')

      await vi.advanceTimersByTimeAsync(1_000)
      expect(wrapper.get('[data-test="count-in"]').text()).toBe('3')
      expect(wrapper.get('[data-test="cycles-left"]').text()).toBe('10')

      await vi.advanceTimersByTimeAsync(3_000)
      expect(wrapper.find('[data-test="count-in"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="cycles-left"]').text()).toBe('10')

      await vi.advanceTimersByTimeAsync(2_000)
      expect(wrapper.get('[data-test="cycles-left"]').text()).toBe('9')

      await vi.advanceTimersByTimeAsync(15_000)
      expect(wrapper.get('[data-test="cycles-left"]').text()).toBe('2')
      expect(wrapper.emitted('save')).toBeUndefined()
    })

    it('leaves nothing to use while it runs but Restart: leaving the session is the other way out', async () => {
      const wrapper = await mountItem(chordChange())

      await wrapper.get('[data-test="start-take"]').trigger('click')
      await vi.advanceTimersByTimeAsync(8_000)

      for (const button of wrapper.findAll('button').filter((b) => b.attributes('data-test') !== 'restart-take')) {
        const off = button.attributes('disabled') !== undefined || button.attributes('aria-disabled') === 'true'
        expect(off, button.html()).toBe(true)
      }
      expect(wrapper.get('[data-test="restart-take"]').attributes('disabled')).toBeUndefined()
      expect(wrapper.get('[data-test="tempo-slider"]').attributes('disabled')).toBeDefined()
      expect(wrapper.find('[data-test="start-take"]').exists()).toBe(false)
    })

    it('can be restarted during the count-in too', async () => {
      const wrapper = await mountItem(chordChange())

      await wrapper.get('[data-test="start-take"]').trigger('click')
      await wrapper.get('[data-test="restart-take"]').trigger('click')

      expect(wrapper.find('[data-test="count-in"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="start-take"]').exists()).toBe(true)
    })

    it('restarting throws the take away: the metronome stops, ready again at the tempo set with 10 cycles, nothing sent', async () => {
      const wrapper = await mountItem(chordChange({ start_tempo_bpm: 45 }))

      await setTempo(wrapper, 50)
      await wrapper.get('[data-test="start-take"]').trigger('click')
      await vi.advanceTimersByTimeAsync(12_000)
      stopMetronome.mockClear()
      await wrapper.get('[data-test="restart-take"]').trigger('click')

      expect(stopMetronome).toHaveBeenCalled()
      expect(wrapper.get('[data-test="cycles-left"]').text()).toBe('10')
      expect(wrapper.get('[data-test="tempo-value"]').text()).toContain('50')
      expect(wrapper.get('[data-test="tempo-slider"]').attributes('disabled')).toBeUndefined()
      expect(wrapper.find('[data-test="start-take"]').exists()).toBe(true)

      await vi.advanceTimersByTimeAsync(120_000)
      expect(shares(wrapper)).toHaveLength(0)
      expect(wrapper.emitted('save')).toBeUndefined()
    })

    it('stops the metronome when the tenth cycle ends, and offers four shares of clean changes, none picked', async () => {
      const wrapper = await mountItem(chordChange())

      await playTheTake(wrapper, 60)

      expect(stopMetronome).toHaveBeenCalled()
      expect(wrapper.get('[data-test="change-meta"]').text()).toBe('How many changes rang clean, every string sounding?')
      expect(shares(wrapper).map((share) => share.text())).toEqual(['25 %', '50 %', '75 %', '100 %'])
      expect(shares(wrapper).every((share) => share.attributes('aria-pressed') === 'false')).toBe(true)
      expect(wrapper.emitted('save')).toBeUndefined()
    })
  })

  describe('the share', () => {
    it('sends the tempo played and the share picked', async () => {
      const wrapper = await mountItem(chordChange())

      await playTheTake(wrapper, 60)
      await shares(wrapper)[2]!.trigger('click')

      expect(wrapper.emitted('save')).toEqual([[60, 75]])
    })

    it('sends the tempo the student set, not the plan’s', async () => {
      const wrapper = await mountItem(chordChange({ start_tempo_bpm: 45 }))

      await setTempo(wrapper, 50)
      await playTheTake(wrapper, 50)
      await shares(wrapper)[3]!.trigger('click')

      expect(wrapper.emitted('save')).toEqual([[50, 100]])
    })
  })

  describe('on bass', () => {
    type Source = { chords: unknown[]; chordInstrument: unknown; bass: { instrument: unknown; bars: number[][] }; tempoBpm: number; countInBars: number }
    const source = () => toValue(player.source as MaybeRefOrGetter<Source | null>)

    it('sounds each root on its beat after the count-in, in the bass’s voice, the click with it, and no chord', async () => {
      const wrapper = await mountItem(rootChange(), { bass: drillBass })

      await wrapper.get('[data-test="start-take"]').trigger('click')

      expect(player.toggle).toHaveBeenCalledTimes(1)
      expect(player.metronome.value).toBe(true)
      expect(startMetronome).not.toHaveBeenCalled()
      // Am's root A1 is MIDI 33 on the open A string, C's C2 36 on its third fret: ten cycles, four beats a bar.
      expect(source()).toMatchObject({
        chords: [],
        chordInstrument: null,
        bass: { instrument: drillBass, bars: Array.from({ length: 5 }, () => [33, 36, 33, 36]) },
        tempoBpm: 60,
        countInBars: 1,
      })
    })

    it('stops the roots when the take is restarted or over', async () => {
      const wrapper = await mountItem(rootChange(), { bass: drillBass })

      await wrapper.get('[data-test="start-take"]').trigger('click')
      await wrapper.get('[data-test="restart-take"]').trigger('click')
      expect(player.stop).toHaveBeenCalledTimes(1)

      await playTheBassTake(wrapper)
      expect(player.stop).toHaveBeenCalledTimes(2)
    })

    it('holds the count-in while the roots load, so the take never runs ahead of what is heard', async () => {
      const wrapper = await mountItem(rootChange(), { bass: drillBass })

      await wrapper.get('[data-test="start-take"]').trigger('click')
      player.state.value = 'loading'
      await vi.advanceTimersByTimeAsync(60_000)

      expect(wrapper.get('[data-test="count-in"]').text()).toBe('4')
      expect(wrapper.get('[data-test="cycles-left"]').text()).toBe('10')
      expect(shares(wrapper)).toHaveLength(0)
      expect(player.stop).not.toHaveBeenCalled()
    })

    it('counts the count-in and the cycles by the beat the roots are at, not by the time since Start', async () => {
      const wrapper = await mountItem(rootChange(), { bass: drillBass })

      await wrapper.get('[data-test="start-take"]').trigger('click')
      // Two seconds before the first root at 60 BPM: two beats of count-in left.
      player.musicMs.mockReturnValue(-2_000)
      await vi.advanceTimersByTimeAsync(100)
      expect(wrapper.get('[data-test="count-in"]').text()).toBe('2')

      player.musicMs.mockReturnValue(5_000)
      await vi.advanceTimersByTimeAsync(100)
      expect(wrapper.find('[data-test="count-in"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="cycles-left"]').text()).toBe('8')

      // Long past the take by the wall clock, but the roots are only at their nineteenth beat.
      player.musicMs.mockReturnValue(19_000)
      await vi.advanceTimersByTimeAsync(60_000)
      expect(wrapper.get('[data-test="cycles-left"]').text()).toBe('1')
      expect(shares(wrapper)).toHaveLength(0)
      expect(player.stop).not.toHaveBeenCalled()
    })

    it('asks for the share when the roots have played through and the player stops by itself', async () => {
      const wrapper = await mountItem(rootChange(), { bass: drillBass })

      await wrapper.get('[data-test="start-take"]').trigger('click')
      player.musicMs.mockReturnValue(19_900)
      await vi.advanceTimersByTimeAsync(100)
      player.state.value = 'idle'
      await vi.advanceTimersByTimeAsync(100)

      expect(shares(wrapper)).toHaveLength(4)
    })

    it('is ready again, saying the sound didn’t load, when the roots can’t load, and asks for no share', async () => {
      const wrapper = await mountItem(rootChange(), { bass: drillBass })

      await wrapper.get('[data-test="start-take"]').trigger('click')
      player.state.value = 'error'
      await vi.advanceTimersByTimeAsync(60_000)

      expect(wrapper.find('[data-test="start-take"]').exists()).toBe(true)
      expect(wrapper.get('[role="alert"]').text()).toBe("The sound didn't load. Check your connection and try again.")
      expect(shares(wrapper)).toHaveLength(0)
    })

    it('can only be skipped when the bass isn’t known', async () => {
      const wrapper = await mountItem(rootChange())

      await wrapper.get('[data-test="skip-item"]').trigger('click')

      expect(wrapper.emitted('skip')).toEqual([['unavailable']])
    })

    it('marks both roots on the board, named by their chords', async () => {
      const wrapper = await mountItem(rootChange(), { bass: drillBass })

      expect(wrapper.get('[data-test="item-title"]').text()).toBe('Am and C roots, back and forth')
      const places = wrapper.findAll('[data-test="marked-place"]')
      expect(places.map((place) => place.attributes('aria-label'))).toEqual(['Root of Am, string 3, open', 'Root of C, string 3, fret 3'])
    })

    it('asks how many changes the root rang clean, and sends the share', async () => {
      const wrapper = await mountItem(rootChange(), { bass: drillBass })

      await playTheBassTake(wrapper)
      expect(wrapper.get('[data-test="change-meta"]').text()).toBe('How many changes rang clean, the root sounding?')
      await shares(wrapper)[1]!.trigger('click')

      expect(wrapper.emitted('save')).toEqual([[60, 50]])
    })
  })

  it('on guitar, sounds nothing but the metronome', async () => {
    const wrapper = await mountItem(chordChange())

    await wrapper.get('[data-test="start-take"]').trigger('click')

    expect(startMetronome).toHaveBeenCalled()
    expect(player.toggle).not.toHaveBeenCalled()
  })

  it('can only be skipped, as unavailable, when a chord can’t be drawn', async () => {
    GET.mockReset()
    serve({ failing: true })
    const wrapper = await mountItem(chordChange())

    expect(wrapper.find('[data-test="start-take"]').exists()).toBe(false)
    await wrapper.get('[data-test="skip-item"]').trigger('click')

    expect(wrapper.emitted('skip')).toEqual([['unavailable']])
  })
})
