import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type LearnerSongChart = components['schemas']['LearnerSongChart']
type Instrument = components['schemas']['Instrument']

const state = {
  chart: ref<LearnerSongChart | null>(null),
  instrument: ref<Instrument | null>(null),
  isLoading: ref(false),
  error: ref(false),
  notFound: ref(false),
  retry: vi.fn(),
}
const chartOf = vi.fn((songChartId: string) => {
  void songChartId
  return state
})
vi.mock('@/shared/composables/usePublishedSongChart', () => ({
  usePublishedSongChart: (songChartId: string) => chartOf(songChartId),
}))

const progression = (key: string, en: string) => ({ progression_id: key, key, bars: [], confusable: [], names: { en } })
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({
    coreApi: { GET: () => Promise.resolve({ data: [progression('I-IV-I-V', 'I–IV–I–V')], error: undefined, response: { status: 200 } }) },
    eventApi: {},
  }),
}))

const strum = vi.fn()
const playRoot = vi.fn()
vi.mock('@/shared/composables/useChordSound', () => ({ useChordSound: () => ({ strum, playRoot }) }))

const metronomeOn = ref(false)
const toggleMetronome = vi.fn(() => {
  metronomeOn.value = !metronomeOn.value
})
vi.mock('@/shared/composables/useMetronome', () => ({
  useMetronome: () => ({ on: metronomeOn, toggle: toggleMetronome }),
}))

import SessionSong from '@/features/student/components/SessionSong.vue'
import { songItem } from '@/features/student/testing/songItems'
import type { TakeRating } from '@/features/student/utils/tempoLadder'
import { clearProgressionCatalog } from '@/shared/composables/useProgressionCatalog'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { drillBass } from '@/shared/testUtils/drill'
import { chordC, makeLearnerSongChart } from '@/shared/testUtils/songChart'

const guitar = makeFrettedInstrument()

// A chord box draws a voicing; these tests are about which chords are shown, not how.
const stubs = { ChordBox: { props: ['voicing'], template: '<div data-test="chord-box" />' } }

async function mountSong(options: { onBass?: boolean; sectionIndex?: number; songRating?: TakeRating | null } = {}) {
  const wrapper = mount(SessionSong, {
    props: {
      item: songItem({ onBass: options.onBass, sectionIndex: options.sectionIndex }),
      songRating: options.songRating ?? null,
      layout: options.onBass ? drillBass : guitar,
    },
    global: { stubs },
  })
  await flushPromises()
  return wrapper
}

async function start(wrapper: VueWrapper) {
  await wrapper.get('[data-test="start-song"]').trigger('click')
}

const text = (wrapper: VueWrapper, test: string) => wrapper.get(`[data-test="${test}"]`).text()

enableAutoUnmount(afterEach)

beforeEach(() => {
  clearProgressionCatalog()
  state.chart.value = makeLearnerSongChart()
  state.instrument.value = guitar
  state.isLoading.value = false
  state.error.value = false
  state.notFound.value = false
  state.retry.mockReset()
  chartOf.mockClear()
  strum.mockReset()
  playRoot.mockReset()
  toggleMetronome.mockClear()
  metronomeOn.value = false
})

describe('SessionSong', () => {
  describe('before the song', () => {
    it('reads the latest published chart, and says why it was picked by the section that plays the progression', async () => {
      const wrapper = await mountSong()

      expect(chartOf).toHaveBeenCalledWith('chart-amazing-grace')
      expect(text(wrapper, 'item-title')).toBe('Amazing Grace')
      expect(text(wrapper, 'item-reason')).toBe('Put it into music')
      expect(wrapper.findAll('[data-test="song-chip"]').map((c) => c.text())).toEqual(['Key G', 'No capo'])
      expect(text(wrapper, 'song-why')).toBe('Its verse plays I–IV–I–V, the progression you practised today. Tap a chord to hear it.')
      expect(wrapper.find('[data-test="roots-hint"]').exists()).toBe(false)
      expect(text(wrapper, 'start-song')).toBe('Start')
    })

    it('names the section by its kind', async () => {
      const wrapper = await mountSong({ sectionIndex: 1 })

      expect(text(wrapper, 'song-why')).toMatch(/^Its chorus plays I–IV–I–V/)
    })

    it('shows the chords in this song on guitar, and strums the one tapped', async () => {
      const wrapper = await mountSong()

      expect(wrapper.findAll('[data-test="strip-chord"]').map((c) => c.attributes('data-chord'))).toEqual(['G', 'C'])
      await wrapper.findAll('[data-test="strip-chord"]')[1]!.trigger('click')

      const cDiagram = state.chart.value!.diagrams.find((d) => d.diagram_id === chordC.voicings[0]!.diagram_id)
      expect(strum).toHaveBeenCalledWith(cDiagram, guitar)
    })

    it('on bass, asks for the root of each chord and shows the chords as a chart of symbols, playing the root tapped', async () => {
      const wrapper = await mountSong({ onBass: true })

      expect(text(wrapper, 'roots-hint')).toBe('Play the root of each chord')
      expect(wrapper.find('[data-test="strip-chord"]').exists()).toBe(false)
      const bars = wrapper.findAll('[data-test="song-bar"]')
      expect(bars.map((b) => b.text())).toEqual(['G', 'C'])
      expect(text(wrapper, 'song-why')).toBe('Its verse plays I–IV–I–V, the progression you practised today. Tap a chord to hear its root.')

      await bars[1]!.trigger('click')

      expect(playRoot).toHaveBeenCalledWith(chordC.root, drillBass)
    })

    it("offers the metronome at the chart's tempo, and none for a chart without one", async () => {
      state.chart.value = makeLearnerSongChart({ tempo_bpm: 80, time_signature: { beats: 3, beat_value: 4 } })
      const wrapper = await mountSong()

      expect(wrapper.findAll('[data-test="song-chip"]').map((c) => c.text())).toEqual(['Key G', 'No capo', '3/4'])
      expect(text(wrapper, 'song-metronome')).toBe("Metronome off · 80 BPM (the chart's tempo)")
      await wrapper.get('[data-test="song-metronome"]').trigger('click')
      expect(toggleMetronome).toHaveBeenCalledTimes(1)
      expect(text(wrapper, 'song-metronome')).toBe("Metronome on · 80 BPM (the chart's tempo)")

      state.chart.value = makeLearnerSongChart({ tempo_bpm: null })
      const untimed = await mountSong()
      expect(untimed.find('[data-test="song-metronome"]').exists()).toBe(false)
    })
  })

  describe('playing', () => {
    it('shows the chart as written, never transposed, with its key and capo by the title', async () => {
      state.chart.value = makeLearnerSongChart({ capo_fret: 2 })
      const wrapper = await mountSong()

      await start(wrapper)

      expect(text(wrapper, 'song-key')).toBe('Key G · capo 2')
      expect(wrapper.findAll('[data-test="chord-symbol"]').map((c) => c.text())).toEqual(['G', 'C', 'G'])
      expect(wrapper.findAll('[data-test="chord-word"]')[0]!.text()).toBe('Amazing')
      expect(wrapper.find('[data-test="strip-chord"]').exists()).toBe(false)
      expect(text(wrapper, 'played-song')).toBe('I played it')
    })

    it('keeps asking for the roots on bass', async () => {
      const wrapper = await mountSong({ onBass: true })

      await start(wrapper)

      expect(text(wrapper, 'roots-hint')).toBe('Play the root of each chord')
      expect(text(wrapper, 'song-key')).toBe('Key G · no capo')
    })

    it('asks how the song went once played, and sends the rating', async () => {
      const wrapper = await mountSong()
      await start(wrapper)

      await wrapper.get('[data-test="played-song"]').trigger('click')

      expect(text(wrapper, 'rate-prompt')).toBe('How did Amazing Grace go?')
      await wrapper.get('[data-test="rate-clean"]').trigger('click')
      expect(wrapper.emitted('rate')).toEqual([['clean']])
    })
  })

  describe('after rating', () => {
    it("shows only today's rating, and finishes the session", async () => {
      const wrapper = await mountSong({ songRating: 'clean' })

      expect(text(wrapper, 'song-result')).toBe('You played Amazing Grace clean.')
      expect(text(wrapper, 'song-result-title')).toBe('Amazing Grace')
      expect(text(wrapper, 'song-result-day')).toBe('Today')
      expect(text(wrapper, 'song-result-rating')).toBe('Clean')
      expect(wrapper.find('[data-test="self-rating"]').exists()).toBe(false)

      await wrapper.get('[data-test="finish-song"]').trigger('click')
      expect(text(wrapper, 'finish-song')).toBe('Finish')
      expect(wrapper.emitted('next')).toHaveLength(1)
    })

    it('says how a song that went less well went', async () => {
      expect(text(await mountSong({ songRating: 'almost' }), 'song-result')).toBe('You almost played Amazing Grace clean.')
      expect(text(await mountSong({ songRating: 'struggled' }), 'song-result')).toBe('Amazing Grace was a struggle today.')
    })
  })

  describe('a chart that cannot be shown', () => {
    it('waits for the chart', async () => {
      state.chart.value = null
      state.isLoading.value = true
      const wrapper = await mountSong()

      expect(wrapper.find('[data-test="skeleton-label"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="start-song"]').exists()).toBe(false)
    })

    it('offers to try again when the chart did not load', async () => {
      state.chart.value = null
      state.error.value = true
      const wrapper = await mountSong()

      await wrapper.get('[data-test="retry-song"]').trigger('click')

      expect(state.retry).toHaveBeenCalledTimes(1)
    })

    it('can only be skipped, as unavailable, when the chart was withdrawn', async () => {
      state.chart.value = null
      state.notFound.value = true
      const wrapper = await mountSong()

      await wrapper.get('[data-test="skip-item"]').trigger('click')

      expect(wrapper.emitted('skip')).toEqual([['unavailable']])
    })
  })
})
