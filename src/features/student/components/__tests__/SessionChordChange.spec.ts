import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

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

import SessionChordChange from '@/features/student/components/SessionChordChange.vue'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { drillGuitar, drillVoicings } from '@/shared/testUtils/drill'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']
type Take = components['schemas']['ChangeTake']

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

const AM = drillVoicings.Am.diagram.diagram_id
const C = drillVoicings.C.diagram.diagram_id
const BASS = 'instrument-bass'
const BASS_TUNING = ['E1', 'A1', 'D2', 'G2']

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

const shares = (wrapper: Awaited<ReturnType<typeof mountItem>>) => wrapper.findAll('[data-test="clean-share"]')

describe('SessionChordChange', () => {
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
    it('marks both roots on the board, named by their chords', async () => {
      const wrapper = await mountItem(rootChange(), { tuning: BASS_TUNING })

      expect(wrapper.get('[data-test="item-title"]').text()).toBe('Am and C roots, back and forth')
      const places = wrapper.findAll('[data-test="marked-place"]')
      expect(places.map((place) => place.attributes('aria-label'))).toEqual(['Root of Am, string 3, open', 'Root of C, string 3, fret 3'])
    })

    it('asks how many changes the root rang clean, and sends the share', async () => {
      const wrapper = await mountItem(rootChange(), { tuning: BASS_TUNING })

      await playTheTake(wrapper, 60)
      expect(wrapper.get('[data-test="change-meta"]').text()).toBe('How many changes rang clean, the root sounding?')
      await shares(wrapper)[1]!.trigger('click')

      expect(wrapper.emitted('save')).toEqual([[60, 50]])
    })
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
