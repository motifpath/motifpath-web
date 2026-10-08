import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'

const track = vi.fn()
vi.mock('@/shared/composables/useEventTracking', () => ({
  useEventTracking: () => ({ track }),
}))

import SongChartReader from '@/shared/components/songChart/SongChartReader.vue'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import {
  cOpen,
  chordC,
  gEShape,
  makeAnchor,
  makeChord,
  makeLearnerSongChart,
  makeLyricLine,
  makeSection,
} from '@/shared/testUtils/songChart'

const instrument = makeFrettedInstrument()

// The diagram and its player draw and sound a voicing; these tests are about which voicing and
// playback the sheet shows, not how they're drawn.
const stubs = {
  FrettedDiagramView: { props: ['diagram'], template: '<div data-test="voicing-diagram" :data-diagram-id="diagram.diagram_id" />' },
  DiagramPlayer: { props: ['playback'], template: '<div data-test="voicing-player" :data-playback-id="playback?.playback_id" />' },
}

function mountReader(chart = makeLearnerSongChart(), readerInstrument: typeof instrument | null = instrument): VueWrapper {
  return mount(SongChartReader, { props: { chart, instrument: readerInstrument }, global: { stubs }, attachTo: document.body })
}

/** The chord shown over each word, in order: [chord, word]. */
function chordsOverWords(wrapper: VueWrapper): Array<[string, string]> {
  return wrapper.findAll('[data-test="chord-segment"]').map((s) => [
    s.find('[data-test="chord-symbol"]').text(),
    s.find('[data-test="chord-word"]').text(),
  ])
}

async function tapChord(wrapper: VueWrapper, symbol: string) {
  const chord = wrapper.findAll('button[data-test="chord-symbol"]').find((b) => b.text() === symbol)
  if (!chord) throw new Error(`no tappable chord ${symbol}`)
  await chord.trigger('click')
}

function sheet(): HTMLElement {
  const el = document.body.querySelector<HTMLElement>('[data-test="voicing-sheet"]')
  if (!el) throw new Error('the voicing sheet is not open')
  return el
}

async function clickInSheet(wrapper: VueWrapper, selector: string, text?: string) {
  const target = Array.from(sheet().querySelectorAll<HTMLElement>(selector)).find((el) => !text || el.textContent?.includes(text))
  if (!target) throw new Error(`nothing matches ${selector} ${text ?? ''} in the sheet`)
  target.click()
  await wrapper.vm.$nextTick()
}

function selectedVoicing(): string | null {
  return sheet().querySelector('[data-test="voicing-tab"][aria-selected="true"]')?.getAttribute('data-voicing-id') ?? null
}

function eventsOfType(type: string) {
  return track.mock.calls.map(([event]) => event).filter((event) => event.event_type === type)
}

beforeEach(() => {
  track.mockReset()
  document.body.innerHTML = ''
})

describe('SongChartReader', () => {
  describe('reading', () => {
    it('shows each chord over the word it falls on', () => {
      const wrapper = mountReader()

      expect(chordsOverWords(wrapper)).toEqual([
        ['G', 'Quando'],
        ['C', 'terra'],
        ['G', 'Que'],
      ])
    })

    it('shows the title, the artist and each section label', () => {
      const wrapper = mountReader()

      expect(wrapper.text()).toContain('Asa Branca')
      expect(wrapper.text()).toContain('Luiz Gonzaga')
      expect(wrapper.text()).toContain('Refrão')
    })

    it('sends song_chart.opened for the revision being read', () => {
      mountReader()

      expect(eventsOfType('song_chart.opened')).toEqual([
        { event_type: 'song_chart.opened', song_chart_context: { song_chart_id: 'chart-asa-branca', revision_number: 2 } },
      ])
    })

    it('sends nothing in a preview of the draft', async () => {
      const wrapper = mountReader(makeLearnerSongChart({ revision_number: null }))
      await tapChord(wrapper, 'G')
      await wrapper.find('[data-test="section-played"]').trigger('click')

      expect(track).not.toHaveBeenCalled()
    })
  })

  describe('the voicing sheet', () => {
    it("opens on the author's pick and sends song_chart.chord_viewed", async () => {
      const chart = makeLearnerSongChart()
      chart.body.content[0] = makeSection([
        makeLyricLine(['Quando', makeAnchor('a1', 'G', { chordDefinitionId: 'chord-g', chordVoicingId: gEShape.chord_voicing_id })]),
      ])
      const wrapper = mountReader(chart)

      await tapChord(wrapper, 'G')

      expect(selectedVoicing()).toBe('g-e-shape-3')
      expect(eventsOfType('song_chart.chord_viewed')).toEqual([
        {
          event_type: 'song_chart.chord_viewed',
          song_chart_context: { song_chart_id: 'chart-asa-branca', revision_number: 2 },
          anchor_id: 'a1',
          chord_definition_id: 'chord-g',
          chord_voicing_id: 'g-e-shape-3',
        },
      ])
    })

    it('opens on the best voicing without a pick', async () => {
      const wrapper = mountReader()

      await tapChord(wrapper, 'C')

      expect(selectedVoicing()).toBe(cOpen.chord_voicing_id)
    })

    it("shows the selected voicing's diagram and its default playback", async () => {
      const wrapper = mountReader()

      await tapChord(wrapper, 'C')

      expect(sheet().querySelector('[data-test="voicing-diagram"]')?.getAttribute('data-diagram-id')).toBe('diagram-c-open')
      expect(sheet().querySelector('[data-test="voicing-player"]')?.getAttribute('data-playback-id')).toBe('c-open-strum')
    })

    it('switches voicings and playbacks without sending anything more', async () => {
      const wrapper = mountReader()
      await tapChord(wrapper, 'C')
      track.mockReset()

      await clickInSheet(wrapper, '[data-voicing-id="c-a-shape-3"]')
      await clickInSheet(wrapper, '[data-test="playback-tab"]', 'Arpeggio')

      expect(selectedVoicing()).toBe('c-a-shape-3')
      expect(sheet().querySelector('[data-test="voicing-player"]')?.getAttribute('data-playback-id')).toBe('c-a-shape-3-arpeggio')
      expect(track).not.toHaveBeenCalled()
    })

    it("titles a slash chord the catalog lacks as written and notes its bass isn't shown", async () => {
      const chart = makeLearnerSongChart()
      chart.body.content[0] = makeSection([makeLyricLine(['Quando', makeAnchor('a1', 'C/G', { chordDefinitionId: 'chord-c' })])])
      const wrapper = mountReader(chart)

      await tapChord(wrapper, 'C/G')

      expect(sheet().querySelector('[data-test="voicing-sheet-title"]')?.textContent).toBe('C/G')
      expect(sheet().textContent).toContain('G')
      expect(sheet().querySelector('[data-test="missing-bass"]')).not.toBeNull()
    })

    it('closes', async () => {
      const wrapper = mountReader()
      await tapChord(wrapper, 'C')

      await clickInSheet(wrapper, '[data-test="voicing-sheet-close"]')

      expect(document.body.querySelector('[data-test="voicing-sheet"]')).toBeNull()
    })
  })

  describe('chords with nothing to show', () => {
    it('shows a no-chord marking as text that opens no sheet', () => {
      const chart = makeLearnerSongChart()
      chart.body.content[0] = makeSection([makeLyricLine(['Quando', makeAnchor('a1', 'N.C.')])])
      const wrapper = mountReader(chart)

      const segment = wrapper.find('[data-test="chord-segment"]')
      expect(segment.find('[data-test="chord-symbol"]').text()).toBe('N.C.')
      expect(segment.find('button').exists()).toBe(false)
    })

    it('shows a chord whose catalog chord has no voicing as text', () => {
      const chart = makeLearnerSongChart({ chords: [makeChord('chord-g', 'G', []), chordC] })
      const wrapper = mountReader(chart)

      expect(wrapper.findAll('button[data-test="chord-symbol"]').map((b) => b.text())).toEqual(['C'])
    })

    it('shows every chord as text when there is no instrument to draw voicings on', () => {
      const wrapper = mountReader(makeLearnerSongChart(), null)

      expect(wrapper.findAll('button[data-test="chord-symbol"]')).toHaveLength(0)
      expect(wrapper.findAll('[data-test="chord-symbol"]').map((c) => c.text())).toEqual(['G', 'C', 'G'])
    })
  })

  describe('sections played', () => {
    it('sends song_chart.section_completed and shows the section as played', async () => {
      const wrapper = mountReader()

      await wrapper.findAll('[data-test="section-played"]')[0]!.trigger('click')

      expect(eventsOfType('song_chart.section_completed')).toEqual([
        {
          event_type: 'song_chart.section_completed',
          song_chart_context: { song_chart_id: 'chart-asa-branca', revision_number: 2 },
          section_index: 0,
        },
      ])
      expect(wrapper.findAll('[data-test="section-played"]')[0]!.attributes('aria-pressed')).toBe('true')
    })

    it('sends nothing more when a section is marked again', async () => {
      const wrapper = mountReader()
      const played = () => wrapper.findAll('[data-test="section-played"]')[1]!

      await played().trigger('click')
      await played().trigger('click')

      expect(eventsOfType('song_chart.section_completed')).toEqual([expect.objectContaining({ section_index: 1 })])
    })
  })
})
