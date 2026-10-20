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
type Minute = components['schemas']['ChangeMinute']

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

function minute(fields: Partial<Minute> = {}): Minute {
  return { start_tempo_bpm: 60, target_changes_per_minute: 60, best_clean_changes_per_minute: null, last_changes_per_minute: null, ...fields }
}

const base = { rung: 'play_in_time', reason: 'new', node_id: null, level: 'new', estimated_seconds: 90 } as const

function chordChange(fields: Partial<Minute> = {}): Item {
  return {
    ...base,
    item_key: `chord_change:${AM}:${C}`,
    kind: 'chord_change',
    chord_change: { from_diagram_id: AM, to_diagram_id: C, from_chord_symbol: 'Am', to_chord_symbol: 'C', minute: minute(fields) },
  }
}

function rootChange(fields: Partial<Minute> = {}): Item {
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
      minute: minute(fields),
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

/** Starts the minute and plays it through: a bar of count-in at the tempo, then 60 seconds. */
async function playTheMinute(wrapper: Awaited<ReturnType<typeof mountItem>>, bpm: number) {
  await wrapper.get('[data-test="start-minute"]').trigger('click')
  await vi.advanceTimersByTimeAsync((4 * 60_000) / bpm + 60_000 + 500)
}

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

    it('is set to the plan’s tempo, and shows the best clean count', async () => {
      const wrapper = await mountItem(chordChange({ start_tempo_bpm: 45, best_clean_changes_per_minute: 16 }))

      expect(wrapper.get('[data-test="tempo-value"]').text()).toContain('45')
      expect(wrapper.get('[data-test="change-meta"]').text()).toBe('Change on every beat · best 16 clean changes')
      expect(wrapper.get('[data-test="timer-time"]').text()).toBe('1:00')
    })

    it('says only to change on every beat when there is no clean minute yet', async () => {
      const wrapper = await mountItem(chordChange())

      expect(wrapper.get('[data-test="change-meta"]').text()).toBe('Change on every beat')
    })

    it('lets the metronome tick while the tempo is tried, at the tempo set', async () => {
      const wrapper = await mountItem(chordChange({ start_tempo_bpm: 45 }))

      await wrapper.get('[data-test="metronome"]').trigger('click')
      expect(toggleMetronome).toHaveBeenCalledTimes(1)
      expect(metronomeSettings[0]).toMatchObject({ bpm: 45, beats: 4 })
    })

    it('sends nothing before the minute is over', async () => {
      const wrapper = await mountItem(chordChange())

      await setTempo(wrapper, 50)
      await wrapper.get('[data-test="start-minute"]').trigger('click')

      expect(wrapper.emitted('save')).toBeUndefined()
    })
  })

  describe('the minute', () => {
    it('counts in one bar at the tempo, then runs 60 seconds, the metronome ticking', async () => {
      const wrapper = await mountItem(chordChange({ start_tempo_bpm: 60 }))

      await wrapper.get('[data-test="start-minute"]').trigger('click')
      expect(startMetronome).toHaveBeenCalledWith(expect.objectContaining({ bpm: 60, beats: 4 }))
      expect(wrapper.get('[data-test="count-in"]').text()).toBe('4')

      await vi.advanceTimersByTimeAsync(1_000)
      expect(wrapper.get('[data-test="count-in"]').text()).toBe('3')
      expect(wrapper.get('[data-test="timer-time"]').text()).toBe('1:00')

      await vi.advanceTimersByTimeAsync(3_000)
      expect(wrapper.find('[data-test="count-in"]').exists()).toBe(false)

      await vi.advanceTimersByTimeAsync(18_000)
      expect(wrapper.get('[data-test="timer-time"]').text()).toBe('0:42')
    })

    it('leaves nothing to use while it runs but Restart: leaving the session is the other way out', async () => {
      const wrapper = await mountItem(chordChange())

      await wrapper.get('[data-test="start-minute"]').trigger('click')
      await vi.advanceTimersByTimeAsync(10_000)

      for (const button of wrapper.findAll('button').filter((b) => b.attributes('data-test') !== 'restart-minute')) {
        const off = button.attributes('disabled') !== undefined || button.attributes('aria-disabled') === 'true'
        expect(off, button.html()).toBe(true)
      }
      expect(wrapper.get('[data-test="restart-minute"]').attributes('disabled')).toBeUndefined()
      expect(wrapper.get('[data-test="tempo-slider"]').attributes('disabled')).toBeDefined()
      expect(wrapper.find('[data-test="start-minute"]').exists()).toBe(false)
    })

    it('can be restarted during the count-in too', async () => {
      const wrapper = await mountItem(chordChange())

      await wrapper.get('[data-test="start-minute"]').trigger('click')
      await wrapper.get('[data-test="restart-minute"]').trigger('click')

      expect(wrapper.find('[data-test="count-in"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="start-minute"]').exists()).toBe(true)
    })

    it('restarting throws the minute away: ready again at the tempo set, nothing sent', async () => {
      const wrapper = await mountItem(chordChange({ start_tempo_bpm: 45 }))

      await setTempo(wrapper, 50)
      await wrapper.get('[data-test="start-minute"]').trigger('click')
      await vi.advanceTimersByTimeAsync(20_000)
      stopMetronome.mockClear()
      await wrapper.get('[data-test="restart-minute"]').trigger('click')

      expect(stopMetronome).toHaveBeenCalled()
      expect(wrapper.get('[data-test="timer-time"]').text()).toBe('1:00')
      expect(wrapper.get('[data-test="tempo-value"]').text()).toContain('50')
      expect(wrapper.get('[data-test="tempo-slider"]').attributes('disabled')).toBeUndefined()
      expect(wrapper.find('[data-test="start-minute"]').exists()).toBe(true)

      await vi.advanceTimersByTimeAsync(120_000)
      expect(wrapper.find('[role="spinbutton"]').exists()).toBe(false)
      expect(wrapper.emitted('save')).toBeUndefined()
    })

    it('stops the metronome when the minute is up, and asks for the count', async () => {
      const wrapper = await mountItem(chordChange())

      await playTheMinute(wrapper, 60)

      expect(stopMetronome).toHaveBeenCalled()
      expect(wrapper.get('[data-test="change-meta"]').text()).toBe('Time is up. Count only the changes where every string rang.')
      expect(wrapper.find('[role="spinbutton"]').exists()).toBe(true)
    })
  })

  describe('the count', () => {
    it('starts at the item’s last count', async () => {
      const wrapper = await mountItem(chordChange({ last_changes_per_minute: 18, best_clean_changes_per_minute: 16 }))

      await playTheMinute(wrapper, 60)

      expect(wrapper.get('[role="spinbutton"]').text()).toBe('18')
      expect(wrapper.get('[data-test="count-label"]').text()).toBe('clean changes · best 16')
    })

    it('starts at 0 for a change never played', async () => {
      const wrapper = await mountItem(chordChange())

      await playTheMinute(wrapper, 60)

      expect(wrapper.get('[role="spinbutton"]').text()).toBe('0')
      expect(wrapper.get('[data-test="count-label"]').text()).toBe('clean changes')
    })

    it('can’t go above the tempo, and a last count above it starts at the tempo', async () => {
      const wrapper = await mountItem(chordChange({ start_tempo_bpm: 40, last_changes_per_minute: 45 }))

      await playTheMinute(wrapper, 40)

      expect(wrapper.get('[role="spinbutton"]').text()).toBe('40')
      expect(wrapper.get('[data-test="count-more"]').attributes('disabled')).toBeDefined()
    })

    it('saves the tempo played and the count', async () => {
      const wrapper = await mountItem(chordChange({ last_changes_per_minute: 40 }))

      await playTheMinute(wrapper, 60)
      for (let i = 0; i < 2; i++) await wrapper.get('[data-test="count-more"]').trigger('click')
      expect(wrapper.get('[data-test="save-count"]').text()).toBe('Save 42 changes')
      await wrapper.get('[data-test="save-count"]').trigger('click')

      expect(wrapper.emitted('save')).toEqual([[60, 42]])
    })

    it('saves the tempo the student set, not the plan’s', async () => {
      const wrapper = await mountItem(chordChange({ start_tempo_bpm: 45, last_changes_per_minute: 48 }))

      await setTempo(wrapper, 50)
      await playTheMinute(wrapper, 50)
      await wrapper.get('[data-test="save-count"]').trigger('click')

      expect(wrapper.emitted('save')).toEqual([[50, 48]])
    })
  })

  describe('on bass', () => {
    it('marks both roots on the board, named by their chords', async () => {
      const wrapper = await mountItem(rootChange(), { tuning: BASS_TUNING })

      expect(wrapper.get('[data-test="item-title"]').text()).toBe('Am and C roots, back and forth')
      const places = wrapper.findAll('[data-test="marked-place"]')
      expect(places.map((place) => place.attributes('aria-label'))).toEqual(['Root of Am, string 3, open', 'Root of C, string 3, fret 3'])
    })

    it('asks for the changes where the root rang clean, and saves them', async () => {
      const wrapper = await mountItem(rootChange({ last_changes_per_minute: 30 }), { tuning: BASS_TUNING })

      await playTheMinute(wrapper, 60)
      expect(wrapper.get('[data-test="change-meta"]').text()).toBe('Time is up. Count only the changes where the root rang clean.')
      await wrapper.get('[data-test="save-count"]').trigger('click')

      expect(wrapper.emitted('save')).toEqual([[60, 30]])
    })
  })

  it('can only be skipped, as unavailable, when a chord can’t be drawn', async () => {
    GET.mockReset()
    serve({ failing: true })
    const wrapper = await mountItem(chordChange())

    expect(wrapper.find('[data-test="start-minute"]').exists()).toBe(false)
    await wrapper.get('[data-test="skip-item"]').trigger('click')

    expect(wrapper.emitted('skip')).toEqual([['unavailable']])
  })
})
