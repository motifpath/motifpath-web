import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
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

import SongChartReader from '@/shared/components/songChart/SongChartReader.vue'
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
  ChordBoxDiagram: { props: ['voicing'], template: '<div data-test="chord-box" :data-voicing-id="voicing.chord_voicing_id" />' },
  FrettedDiagramView: { props: ['diagram'], template: '<div data-test="neck" :data-diagram-id="diagram.diagram_id" />' },
}

function mountReader(chart = makeLearnerSongChart(), readerInstrument: typeof instrument | null = instrument): VueWrapper {
  return mount(SongChartReader, { props: { chart, instrument: readerInstrument }, global: { stubs } })
}

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
  return wrapper.get('[data-test="voicing-card"]')
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

const context = { song_chart_id: 'chart-asa-branca', revision_number: 2 }

beforeEach(() => {
  track.mockReset()
  toggle.mockReset()
})

describe('SongChartReader', () => {
  describe('reading', () => {
    it('shows each chord over the word it falls on', () => {
      expect(chordsOverWords(mountReader())).toEqual([
        ['G', 'Quando'],
        ['C', 'terra'],
        ['G', 'Que'],
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
        makeLyricLine(['Quando', makeAnchor('a1', 'G', { chordDefinitionId: 'chord-g', chordVoicingId: gEShape.chord_voicing_id })]),
      ])
      const wrapper = mountReader(chart)

      await tap(wrapper, 'G')

      expect(tappable(wrapper, 'G').attributes('aria-pressed')).toBe('true')
      expect(card(wrapper).get('[data-test="voicing-card-title"]').text()).toBe('G')
      expect(selectedVoicing(wrapper)).toBe('g-e-shape-3')
      expect(eventsOfType('song_chart.chord_viewed')).toEqual([
        { event_type: 'song_chart.chord_viewed', song_chart_context: context, anchor_id: 'a1', chord_definition_id: 'chord-g', chord_voicing_id: 'g-e-shape-3' },
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

      await card(wrapper).get('[data-test="view-neck"]').trigger('click')

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
      await card(wrapper).get('[data-test="view-neck"]').trigger('click')
      await card(wrapper).get('[data-test="play-voicing"]').trigger('click')

      expect(selectedVoicing(wrapper)).toBe('c-a-shape-3')
      expect(track).not.toHaveBeenCalled()
    })

    it('moves to another chord when it is tapped', async () => {
      const wrapper = mountReader()
      await tap(wrapper, 'G')

      await tap(wrapper, 'C')

      expect(card(wrapper).get('[data-test="voicing-card-title"]').text()).toBe('C')
      expect(tappable(wrapper, 'C').attributes('aria-pressed')).toBe('true')
      expect(tappable(wrapper, 'G').attributes('aria-pressed')).toBe('false')
      expect(eventsOfType('song_chart.chord_viewed').map((e) => e.anchor_id)).toEqual(['a1', 'a2'])
    })

    it('folds down to its title, and closes', async () => {
      const wrapper = mountReader()
      await tap(wrapper, 'C')

      await card(wrapper).get('[data-test="voicing-card-fold"]').trigger('click')
      expect(card(wrapper).find('[data-test="chord-box"]').exists()).toBe(false)
      expect(card(wrapper).get('[data-test="voicing-card-title"]').text()).toBe('C')

      await card(wrapper).get('[data-test="voicing-card-close"]').trigger('click')
      expect(wrapper.find('[data-test="voicing-card"]').exists()).toBe(false)
      expect(wrapper.findAll('button[data-test="chord-symbol"][aria-pressed="true"]')).toHaveLength(0)
    })

    it("titles a slash chord the catalog lacks as written and notes its bass isn't shown", async () => {
      const chart = makeLearnerSongChart()
      chart.body.content[0] = makeSection([makeLyricLine(['Quando', makeAnchor('a1', 'C/B', { chordDefinitionId: 'chord-c' })])])
      const wrapper = mountReader(chart)

      await tap(wrapper, 'C/B')

      expect(card(wrapper).get('[data-test="voicing-card-title"]').text()).toBe('C/B')
      expect(card(wrapper).get('[data-test="missing-bass"]').text()).toContain('B')
    })
  })

  describe('chords with nothing to show', () => {
    it('shows a no-chord marking as text that opens no card', () => {
      const chart = makeLearnerSongChart()
      chart.body.content[0] = makeSection([makeLyricLine(['Quando', makeAnchor('a1', 'N.C.')])])
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
})
