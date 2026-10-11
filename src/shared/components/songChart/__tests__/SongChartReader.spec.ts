import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'

const track = vi.fn()
vi.mock('@/shared/composables/useEventTracking', () => ({
  useEventTracking: () => ({ track }),
}))
const toggle = vi.fn()
vi.mock('@/shared/composables/useDiagramPlayback', () => ({
  useDiagramPlayback: () => ({ canPlay: ref(true), state: ref('idle'), activePositionIds: ref([]), toggle }),
  isPlayable: () => true,
}))

const metronomeOn = ref(false)
const toggleMetronome = vi.fn(() => {
  metronomeOn.value = !metronomeOn.value
})
vi.mock('@/shared/composables/useMetronome', () => ({
  useMetronome: () => ({ on: metronomeOn, toggle: toggleMetronome }),
}))
const toastSuccess = vi.fn()
vi.mock('@/shared/composables/useToast', () => ({ useToast: () => ({ success: toastSuccess }) }))

import SongChartReader from '@/shared/components/songChart/SongChartReader.vue'
import TempoControl from '@/shared/components/TempoControl.vue'
import { mockViewport } from '@/shared/testUtils/viewport'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import {
  cOpen,
  chordC,
  chordG,
  gEShape,
  makeAnchor,
  makeChord,
  makeLearnerSongChart,
  makeLyricLine,
  makeSection,
} from '@/shared/testUtils/songChart'

const instrument = makeFrettedInstrument()

// The chord box and the neck draw a voicing; these tests are about which voicing and view the
// card shows, not how they're drawn.
const stubs = {
  ChordBox: { props: ['voicing'], template: '<div data-test="chord-box" :data-voicing-id="voicing.chord_voicing_id" />' },
  FrettedDiagramView: { props: ['diagram'], template: '<div data-test="neck" :data-diagram-id="diagram.diagram_id" />' },
}

function mountReader(chart = makeLearnerSongChart(), readerInstrument: typeof instrument | null = instrument, preview = false): VueWrapper {
  return mount(SongChartReader, { props: { chart, instrument: readerInstrument, preview }, global: { stubs }, attachTo: document.body })
}

/** Amazing Grace with its tempo and meter, as the header shows them. */
const timedChart = () => makeLearnerSongChart({ tempo_bpm: 72, time_signature: { beats: 3, beat_value: 4 } })

/** The chord shown over each word, in order: [chord, word]. */
function chordsOverWords(wrapper: VueWrapper): Array<[string, string]> {
  return wrapper.findAll('[data-test="chord-segment"]').map((s) => [
    s.find('[data-test="chord-symbol"]').text(),
    s.find('[data-test="chord-word"]').text(),
  ])
}

function tappable(wrapper: VueWrapper, symbol: string, nth = 0) {
  const chord = wrapper.findAll('button[data-test="chord-symbol"]').filter((b) => b.text() === symbol)[nth]
  if (!chord) throw new Error(`no tappable chord ${symbol}`)
  return chord
}

async function tap(wrapper: VueWrapper, symbol: string, nth = 0) {
  await tappable(wrapper, symbol, nth).trigger('click')
  await flushPromises()
}

function card(wrapper: VueWrapper) {
  return wrapper.get('[data-test="chord-card"]')
}

function chips(wrapper: VueWrapper) {
  return card(wrapper).findAll('[data-test="voicing-chip"]')
}

function selectedVoicing(wrapper: VueWrapper): string | undefined {
  return chips(wrapper).find((c) => c.attributes('aria-pressed') === 'true')?.attributes('data-voicing-id')
}

function eventsOfType(type: string) {
  return track.mock.calls.map(([event]) => event).filter((event) => event.event_type === type)
}

const context = { song_chart_id: 'chart-amazing-grace', revision_number: 2 }

// Every reader listens on the window; one left mounted would hear the next test's keys.
enableAutoUnmount(afterEach)

beforeEach(() => {
  track.mockReset()
  toggle.mockReset()
  toggleMetronome.mockClear()
  toastSuccess.mockReset()
  metronomeOn.value = false
  localStorage.clear()
  mockViewport(390)
})

describe('SongChartReader', () => {
  describe('reading', () => {
    it('shows each chord over the word it falls on', () => {
      expect(chordsOverWords(mountReader())).toEqual([
        ['G', 'Amazing'],
        ['C', 'sweet'],
        ['G', "'Twas"],
      ])
    })

    it('heads each section with its label, or its kind without one', () => {
      const chart = makeLearnerSongChart()
      chart.body.content[0]!.attrs.label = 'Verse 1'
      chart.body.content[1]!.attrs.label = null
      const wrapper = mountReader(chart)

      expect(wrapper.findAll('[data-test="section-heading"]').map((h) => h.text())).toEqual(['Verse 1', 'Chorus'])
    })

    it('sends song_chart.opened for the revision being read', () => {
      mountReader()

      expect(eventsOfType('song_chart.opened')).toEqual([{ event_type: 'song_chart.opened', song_chart_context: context }])
    })

    it('sends nothing in a preview of the draft', async () => {
      const wrapper = mountReader(makeLearnerSongChart({ revision_number: null }))
      await tap(wrapper, 'G')
      await wrapper.get('[data-test="played-it"]').trigger('click')

      expect(track).not.toHaveBeenCalled()
    })
  })

  describe('the voicing card', () => {
    it("opens on the author's pick, highlights the chord, and sends song_chart.chord_viewed", async () => {
      const chart = makeLearnerSongChart()
      chart.body.content[0] = makeSection([
        makeLyricLine(['Amazing', makeAnchor('a1', 'G', { chordDefinitionId: 'chord-g', chordVoicingId: gEShape.chord_voicing_id })]),
      ])
      const wrapper = mountReader(chart)

      await tap(wrapper, 'G')

      expect(tappable(wrapper, 'G').attributes('aria-pressed')).toBe('true')
      expect(card(wrapper).get('[data-test="chord-card-title"]').text()).toBe('G')
      expect(selectedVoicing(wrapper)).toBe('g-e-shape-3')
      expect(eventsOfType('song_chart.chord_viewed')).toEqual([
        { event_type: 'song_chart.chord_viewed', song_chart_context: context, source: 'lyrics', anchor_id: 'a1', chord_definition_id: 'chord-g', chord_voicing_id: 'g-e-shape-3' },
      ])
    })

    it('opens on the best voicing without a pick, shown as a chord box', async () => {
      const wrapper = mountReader()

      await tap(wrapper, 'C')

      expect(selectedVoicing(wrapper)).toBe(cOpen.chord_voicing_id)
      expect(card(wrapper).get('[data-test="chord-box"]').attributes('data-voicing-id')).toBe(cOpen.chord_voicing_id)
      expect(card(wrapper).find('[data-test="neck"]').exists()).toBe(false)
    })

    it('names the voicings by where they sit on the neck', async () => {
      const at = (id: string, lowest: number) => ({ ...cOpen, chord_voicing_id: id, diagram_id: `diagram-${id}`, fret_window: { lowest_fret: lowest, highest_fret: lowest + 3 } })
      const chart = makeLearnerSongChart({ chords: [chordG, makeChord('chord-c', 'C', [at('c-open', 0), at('c-3', 3), at('c-8', 8)])] })
      const wrapper = mountReader(chart)

      await tap(wrapper, 'C')

      expect(chips(wrapper).map((c) => c.text())).toEqual(['Open', '3fr', '8fr'])
    })

    it('switches to the neck', async () => {
      const wrapper = mountReader()
      await tap(wrapper, 'C')

      await card(wrapper).get('[data-test="chord-view-neck"]').trigger('click')

      expect(card(wrapper).get('[data-test="neck"]').attributes('data-diagram-id')).toBe('diagram-c-open')
      expect(card(wrapper).find('[data-test="chord-box"]').exists()).toBe(false)
    })

    it('plays the voicing, named after its default playback', async () => {
      const wrapper = mountReader()
      await tap(wrapper, 'C')

      const play = card(wrapper).get('[data-test="play-voicing"]')
      expect(play.text()).toContain('Strum')
      await play.trigger('click')

      expect(toggle).toHaveBeenCalled()
    })

    it('switches voicings, views and plays without sending anything more', async () => {
      const wrapper = mountReader()
      await tap(wrapper, 'C')
      track.mockReset()

      await chips(wrapper)[1]!.trigger('click')
      await card(wrapper).get('[data-test="chord-view-neck"]').trigger('click')
      await card(wrapper).get('[data-test="play-voicing"]').trigger('click')

      expect(selectedVoicing(wrapper)).toBe('c-a-shape-3')
      expect(track).not.toHaveBeenCalled()
    })

    it('moves to another chord when it is tapped', async () => {
      const wrapper = mountReader()
      await tap(wrapper, 'G')

      await tap(wrapper, 'C')

      expect(card(wrapper).get('[data-test="chord-card-title"]').text()).toBe('C')
      expect(tappable(wrapper, 'C').attributes('aria-pressed')).toBe('true')
      expect(tappable(wrapper, 'G').attributes('aria-pressed')).toBe('false')
      expect(eventsOfType('song_chart.chord_viewed').map((e) => e.anchor_id)).toEqual(['a1', 'a2'])
    })

    it('minimizes to a chip with the chord, and expands from it', async () => {
      const wrapper = mountReader()
      await tap(wrapper, 'C')

      await card(wrapper).get('[data-test="chord-card-minimize"]').trigger('click')
      expect(wrapper.find('[data-test="chord-card"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="chord-card-chip"]').text()).toBe('C')

      await wrapper.get('[data-test="chord-card-chip"]').trigger('click')
      expect(card(wrapper).get('[data-test="chord-card-title"]').text()).toBe('C')
    })

    it('minimizes when the chart scrolls, and stays tappable', async () => {
      const wrapper = mountReader()
      await tap(wrapper, 'G')

      window.dispatchEvent(new Event('scroll'))
      await flushPromises()
      expect(wrapper.get('[data-test="chord-card-chip"]').text()).toBe('G')

      await tap(wrapper, 'C')
      expect(card(wrapper).get('[data-test="chord-card-title"]').text()).toBe('C')
    })

    it('closes, leaving no chord highlighted', async () => {
      const wrapper = mountReader()
      await tap(wrapper, 'C')

      await card(wrapper).get('[data-test="chord-card-close"]').trigger('click')

      expect(wrapper.find('[data-test="chord-card"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="chord-card-chip"]').exists()).toBe(false)
      expect(wrapper.findAll('button[data-test="chord-symbol"][aria-pressed="true"]')).toHaveLength(0)
    })

    it('remembers the voicing chosen for a chord in this song', async () => {
      const wrapper = mountReader()
      await tap(wrapper, 'G')
      await chips(wrapper)[1]!.trigger('click')

      await tap(wrapper, 'C')
      await tap(wrapper, 'G')

      expect(selectedVoicing(wrapper)).toBe(gEShape.chord_voicing_id)
    })

    it('keeps the chosen view for the next chord', async () => {
      const wrapper = mountReader()
      await tap(wrapper, 'G')
      await card(wrapper).get('[data-test="chord-view-neck"]').trigger('click')

      await tap(wrapper, 'C')

      expect(card(wrapper).get('[data-test="neck"]').attributes('data-diagram-id')).toBe('diagram-c-open')
    })

    it("titles a slash chord the catalog lacks as written and notes its bass isn't shown", async () => {
      const chart = makeLearnerSongChart()
      chart.body.content[0] = makeSection([makeLyricLine(['Amazing', makeAnchor('a1', 'C/B', { chordDefinitionId: 'chord-c' })])])
      const wrapper = mountReader(chart)

      await tap(wrapper, 'C/B')

      expect(card(wrapper).get('[data-test="chord-card-title"]').text()).toBe('C/B')
      expect(card(wrapper).get('[data-test="missing-bass"]').text()).toContain('B')
    })
  })

  describe('chords with nothing to show', () => {
    it('shows a no-chord marking as text that opens no card', () => {
      const chart = makeLearnerSongChart()
      chart.body.content[0] = makeSection([makeLyricLine(['Amazing', makeAnchor('a1', 'N.C.')])])
      const segment = mountReader(chart).find('[data-test="chord-segment"]')

      expect(segment.find('[data-test="chord-symbol"]').text()).toBe('N.C.')
      expect(segment.find('button').exists()).toBe(false)
    })

    it('shows a chord whose catalog chord has no voicing as text', () => {
      const wrapper = mountReader(makeLearnerSongChart({ chords: [makeChord('chord-g', 'G', []), chordC] }))

      expect(wrapper.findAll('button[data-test="chord-symbol"]').map((b) => b.text())).toEqual(['C'])
    })

    it('shows every chord as text when there is no instrument to draw voicings on', () => {
      const wrapper = mountReader(makeLearnerSongChart(), null)

      expect(wrapper.findAll('button[data-test="chord-symbol"]')).toHaveLength(0)
    })
  })

  describe('I played it', () => {
    it('sends song_chart.completed and shows the song as played', async () => {
      const wrapper = mountReader()

      await wrapper.get('[data-test="played-it"]').trigger('click')

      expect(eventsOfType('song_chart.completed')).toEqual([{ event_type: 'song_chart.completed', song_chart_context: context }])
      expect(wrapper.get('[data-test="played-it"]').attributes('aria-pressed')).toBe('true')
    })

    it('sends nothing more when tapped again', async () => {
      const wrapper = mountReader()

      await wrapper.get('[data-test="played-it"]').trigger('click')
      await wrapper.get('[data-test="played-it"]').trigger('click')

      expect(eventsOfType('song_chart.completed')).toHaveLength(1)
    })
  })

  describe('the header', () => {
    it('shows the title, the artist and chips for the key, capo, meter and tempo', () => {
      const wrapper = mountReader(timedChart())

      expect(wrapper.get('[data-test="song-title"]').text()).toBe('Amazing Grace')
      expect(wrapper.get('[data-test="song-artist"]').text()).toBe('John Newton')
      expect(wrapper.findAll('[data-test="song-chip"]').map((c) => c.text())).toEqual(['Key G', 'No capo', '3/4', '72 BPM'])
    })

    it('shows no tempo chip for a chart without a tempo', () => {
      const wrapper = mountReader()

      expect(wrapper.findAll('[data-test="song-chip"]').map((c) => c.text())).toEqual(['Key G', 'No capo'])
    })

    it('closes from the bar', async () => {
      const wrapper = mountReader()

      await wrapper.get('[data-test="close-song-chart"]').trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  describe('the chords in this song', () => {
    it('shows each chord once, in the order it first appears', () => {
      const wrapper = mountReader()

      expect(wrapper.findAll('[data-test="strip-chord"]').map((c) => c.attributes('data-chord'))).toEqual(['G', 'C'])
    })

    it('opens the chord card from the strip, sending song_chart.chord_viewed from the strip with no anchor', async () => {
      const wrapper = mountReader()

      await wrapper.findAll('[data-test="strip-chord"]')[1]!.trigger('click')
      await flushPromises()

      expect(card(wrapper).get('[data-test="chord-card-title"]').text()).toBe('C')
      expect(wrapper.findAll('button[data-test="chord-symbol"][aria-pressed="true"]')).toHaveLength(0)
      expect(eventsOfType('song_chart.chord_viewed')).toEqual([
        { event_type: 'song_chart.chord_viewed', song_chart_context: context, source: 'strip', chord_definition_id: 'chord-c', chord_voicing_id: cOpen.chord_voicing_id },
      ])
    })
  })

  describe('the metronome', () => {
    async function turnOn(wrapper: VueWrapper) {
      await wrapper.get('[data-test="reader-metronome"]').trigger('click')
    }

    it("turns on from the bar, at the song's tempo, marked as its target", async () => {
      const wrapper = mountReader(timedChart())

      await turnOn(wrapper)

      expect(toggleMetronome).toHaveBeenCalled()
      const control = wrapper.getComponent(TempoControl)
      expect(control.props('tempo')).toBe(72)
      expect(control.props('goal')).toBe(72)
      expect(wrapper.get('[data-test="tempo-note"]').text()).toBe("Song tempo 72 BPM · you're at 72")
    })

    it('starts at 80 BPM with no target for a chart without a tempo', async () => {
      const wrapper = mountReader()

      await turnOn(wrapper)

      const control = wrapper.getComponent(TempoControl)
      expect(control.props('tempo')).toBe(80)
      expect(control.props('goal')).toBeNull()
    })

    it('remembers a slower tempo for this song, and sends nothing', async () => {
      const wrapper = mountReader(timedChart())
      await turnOn(wrapper)
      track.mockReset()

      wrapper.getComponent(TempoControl).vm.$emit('tempo', 56)
      await flushPromises()

      expect(wrapper.get('[data-test="tempo-note"]').text()).toBe("Song tempo 72 BPM · you're at 56")
      expect(localStorage.getItem('motifpath.songTempo.chart-amazing-grace')).toBe('56')
      expect(track).not.toHaveBeenCalled()
    })

    it('docks the tempo bar above the action bar on a phone', async () => {
      const wrapper = mountReader(timedChart())

      await turnOn(wrapper)

      expect(wrapper.find('[data-test="tempo-bar"]').exists()).toBe(true)
    })
  })

  describe('I played it, redesigned', () => {
    it('becomes a quiet "Played ✓" and confirms with a toast', async () => {
      const wrapper = mountReader()

      await wrapper.get('[data-test="played-it"]').trigger('click')

      expect(wrapper.get('[data-test="played-it"]').text()).toContain('Played')
      expect(toastSuccess).toHaveBeenCalledTimes(1)
    })

    it('confirms only once', async () => {
      const wrapper = mountReader()

      await wrapper.get('[data-test="played-it"]').trigger('click')
      await wrapper.get('[data-test="played-it"]').trigger('click')

      expect(toastSuccess).toHaveBeenCalledTimes(1)
    })
  })

  describe('the admin preview', () => {
    it('says it is a draft and that nothing is recorded', () => {
      const wrapper = mountReader(makeLearnerSongChart({ revision_number: null }), instrument, true)

      expect(wrapper.get('[data-test="preview-banner"]').text()).toBe('Preview of the draft · nothing is recorded')
      expect(wrapper.findAll('[data-test="song-chip"]').map((c) => c.text())).toContain('Draft')
    })

    it('sends nothing for the strip, the metronome or I played it', async () => {
      const wrapper = mountReader(makeLearnerSongChart({ revision_number: null }), instrument, true)

      await wrapper.findAll('[data-test="strip-chord"]')[0]!.trigger('click')
      await wrapper.get('[data-test="reader-metronome"]').trigger('click')
      await wrapper.get('[data-test="played-it"]').trigger('click')

      expect(track).not.toHaveBeenCalled()
      expect(toastSuccess).not.toHaveBeenCalled()
    })
  })

  describe('on a wide screen', () => {
    beforeEach(() => mockViewport(1280))

    it('docks the chord card in a side pane, under the metronome and the chords in this song', async () => {
      const wrapper = mountReader()

      await tap(wrapper, 'G')

      const pane = wrapper.get('[data-test="reader-pane"]')
      expect(pane.find('[data-test="pane-metronome"]').exists()).toBe(true)
      expect(pane.find('[data-test="strip-chord"]').exists()).toBe(true)
      expect(pane.find('[data-test="chord-card"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="floating-chord-card"]').exists()).toBe(false)
    })

    it('opens the pane when the metronome is turned on', async () => {
      const wrapper = mountReader()

      await wrapper.get('[data-test="reader-metronome"]').trigger('click')

      expect(wrapper.find('[data-test="reader-pane"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="tempo-bar"]').exists()).toBe(false)
    })

    it("collapses the pane when the docked card's × is tapped, leaving no chord highlighted", async () => {
      const wrapper = mountReader()
      await tap(wrapper, 'G')

      await card(wrapper).get('[data-test="chord-card-close"]').trigger('click')

      expect(wrapper.find('[data-test="reader-pane"]').exists()).toBe(false)
      expect(wrapper.findAll('button[data-test="chord-symbol"][aria-pressed="true"]')).toHaveLength(0)
    })

    it('turns the metronome on and off with M, and moves the tempo with - and +', async () => {
      const wrapper = mountReader(timedChart())

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }))
      await flushPromises()
      expect(toggleMetronome).toHaveBeenCalledTimes(1)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }))
      await flushPromises()
      expect(wrapper.getComponent(TempoControl).props('tempo')).toBe(67)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }))
      await flushPromises()
      expect(wrapper.getComponent(TempoControl).props('tempo')).toBe(77)
    })
  })
})
