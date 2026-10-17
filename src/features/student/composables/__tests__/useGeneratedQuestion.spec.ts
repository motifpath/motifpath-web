import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useGeneratedQuestion } from '@/features/student/composables/useGeneratedQuestion'
import { i18n } from '@/i18n'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { clearProgressionCatalog } from '@/shared/composables/useProgressionCatalog'
import { drillBass, drillGuitar, drillVoicings } from '@/shared/testUtils/drill'
import type { DrillChordSymbol } from '@/shared/testUtils/drill'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']
type Question = components['schemas']['GeneratedChoiceQuestion']

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

const boxId = (symbol: DrillChordSymbol) => drillVoicings[symbol].diagram.diagram_id
const boxes = (...symbols: DrillChordSymbol[]) => symbols.map((symbol) => ({ chord: symbol, diagram_id: boxId(symbol) }))

const PROGRESSIONS = [
  { progression_id: 'p1', key: 'I-V-vi-IV', bars: ['I', 'V', 'vi', 'IV'], confusable: ['I-vi-IV-V'], names: { en: 'I–V–vi–IV (pop)' } },
  { progression_id: 'p2', key: 'I-vi-IV-V', bars: ['I', 'vi', 'IV', 'V'], confusable: ['I-V-vi-IV'], names: { en: 'I–vi–IV–V (doo-wop)' } },
]

/** Serves the drill voicings' diagrams (each carrying its voicing), the guitar and the progressions. */
function serve(options: { failing?: string[]; progressions?: boolean; bass?: boolean } = {}) {
  GET.mockImplementation((path: string, init?: { params?: { path?: { diagram_id?: string } } }) => {
    if (path === '/instruments') return ok([{ ...drillGuitar, instrument_id: drillVoicings.C.diagram.instrument_id }, ...(options.bass === false ? [] : [drillBass])])
    if (path === '/progressions') return options.progressions === false ? fail() : ok(PROGRESSIONS)
    const id = init?.params?.path?.diagram_id
    const found = Object.values(drillVoicings).find(({ diagram }) => diagram.diagram_id === id)
    if (!found || options.failing?.includes(id ?? '')) return fail()
    return ok({ ...found.diagram, chord_voicing: found.voicing })
  })
}

const BLANK: Question = {
  way: 'numeral_to_chord',
  music_key: 'G',
  numeral: null,
  chord: null,
  function: null,
  progression: null,
  chart: [],
  drawn_as: 'chord_symbols',
  options: [],
  voicings: [],
}

function item(itemKey: string, question: Partial<Question>): Item {
  const kind = itemKey.split(':')[0] as Item['kind']
  return {
    item_key: itemKey,
    kind,
    rung: 'know',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 8,
    generated_choice: { ...BLANK, ...question },
  }
}

const chordOptions = (...values: string[]) => values.map((value) => ({ value, name: null, chart: [] }))

function setUp(planned: Item) {
  let question: ReturnType<typeof useGeneratedQuestion> | undefined
  mount(
    defineComponent({
      setup() {
        question = useGeneratedQuestion(() => planned)
        return () => h('div')
      },
    }),
  )
  return question!
}

beforeEach(() => {
  GET.mockReset()
  clearEmbeddedDiagramCache()
  clearProgressionCatalog()
  i18n.global.locale.value = 'en'
  serve()
})

describe('useGeneratedQuestion', () => {
  describe('a numeral asked on a guitar reading', () => {
    const vi_ = item('diatonic_chord:G:vi', {
      way: 'numeral_to_chord',
      numeral: 'vi',
      drawn_as: 'chord_boxes',
      options: chordOptions('Em', 'D', 'F#dim', 'C'),
      voicings: boxes('Em', 'D', 'C'),
    })

    it('is loading until its boxes are, then asks for the chord among them', async () => {
      const question = setUp(vi_)
      expect(question.status.value).toBe('loading')

      await flushPromises()

      // F#dim has no drill voicing here, so the question can't draw every box it plans.
      expect(question.status.value).toBe('unavailable')
    })

    it('draws every option as its box, names the key and numeral, and says all four are chords of the key', async () => {
      const question = setUp({ ...vi_, generated_choice: { ...vi_.generated_choice!, options: chordOptions('Em', 'D', 'Am', 'C'), voicings: boxes('Em', 'D', 'Am', 'C') } })
      await flushPromises()

      expect(question.status.value).toBe('ready')
      expect(question.prompt.value).toBe('In G, which chord is vi?')
      const view = question.view.value!
      expect(view.instrument).toBe('guitar')
      expect(view.context).toBe('All four are chords of G major.')
      expect(view.options.map((option) => [option.value, option.chord?.voicing?.chord_voicing_id])).toEqual([
        ['Em', drillVoicings.Em.voicing.chord_voicing_id],
        ['D', drillVoicings.D.voicing.chord_voicing_id],
        ['Am', drillVoicings.Am.voicing.chord_voicing_id],
        ['C', drillVoicings.C.voicing.chord_voicing_id],
      ])
      expect(question.instrument.value?.instrument_id).toBe(drillVoicings.C.diagram.instrument_id)
    })

    it('is unavailable when a box can not be loaded, so it is skipped and never counted wrong', async () => {
      serve({ failing: [boxId('Am')] })
      const question = setUp({ ...vi_, generated_choice: { ...vi_.generated_choice!, options: chordOptions('Em', 'D', 'Am', 'C'), voicings: boxes('Em', 'D', 'Am', 'C') } })
      await flushPromises()

      expect(question.status.value).toBe('unavailable')
    })
  })

  it('on a bass reading, offers chord symbols at once, loading nothing', async () => {
    const question = setUp(item('diatonic_chord:G:vi', { way: 'numeral_to_chord', numeral: 'vi', options: chordOptions('Em', 'D', 'F#dim', 'C') }))

    expect(question.status.value).toBe('ready')
    expect(question.view.value!.instrument).toBe('bass')
    expect(question.view.value!.options.map((option) => option.chord?.symbol)).toEqual(['Em', 'D', 'F#dim', 'C'])
    expect(question.instrument.value).toBeNull()
    expect(GET).not.toHaveBeenCalled()
  })

  it('in Portuguese, names the key as a Brazilian musician reads it', () => {
    i18n.global.locale.value = 'pt-BR'
    const question = setUp(item('diatonic_chord:G:vi', { way: 'numeral_to_chord', numeral: 'vi', options: chordOptions('Em', 'D', 'F#dim', 'C') }))

    expect(question.prompt.value).toBe('Em Sol, qual acorde é o vi?')
  })

  it('asks the numeral of a chord, writing viio as vii°', () => {
    const question = setUp(item('diatonic_chord:C:viio', { way: 'chord_to_numeral', music_key: 'C', chord: 'Bdim', options: chordOptions('viio', 'vi', 'V', 'I') }))

    expect(question.prompt.value).toBe('In C, which numeral is this chord?')
    expect(question.view.value!.chord?.symbol).toBe('Bdim')
    expect(question.view.value!.options.map((option) => option.label)).toEqual(['vii°', 'vi', 'V', 'I'])
  })

  it('asks what a chord does, offering the functions by name', () => {
    const question = setUp(
      item('chord_function:G:V', {
        way: 'chord_to_function',
        chord: 'D',
        options: [
          { value: 'tonic', name: 'Tonic — at rest', chart: [] },
          { value: 'dominant', name: 'Dominant — pulls home', chart: [] },
          { value: 'subdominant', name: 'Subdominant — moves away', chart: [] },
        ],
      }),
    )

    expect(question.prompt.value).toBe('In G, what does D do?')
    expect(question.view.value!.options.map((option) => option.label)).toEqual(['Tonic — at rest', 'Dominant — pulls home', 'Subdominant — moves away'])
  })

  it('asks for the chord with a function', () => {
    const question = setUp(item('chord_function:G:V', { way: 'function_to_chord', function: 'dominant', options: chordOptions('D', 'C', 'Em', 'G') }))

    expect(question.prompt.value).toBe('In G, which chord pulls home?')
    expect(question.view.value!.context).toBe('All four are chords of G major.')
  })

  describe('a chart progression', () => {
    const read = item('chart_progression:I-V-vi-IV', {
      way: 'chart_to_numbers',
      music_key: 'C',
      chart: ['C', 'G', 'Am', 'F'],
      drawn_as: 'chord_boxes',
      voicings: boxes('C', 'G', 'Am', 'F'),
      options: [
        { value: 'I-V-vi-IV', name: 'I–V–vi–IV (pop)', chart: [] },
        { value: 'I-vi-IV-V', name: 'I–vi–IV–V (doo-wop)', chart: [] },
      ],
    })

    it('shows its chart in the key and offers the progressions by name, with the catalog to grade it', async () => {
      const question = setUp(read)
      await flushPromises()

      expect(question.status.value).toBe('ready')
      expect(question.prompt.value).toBe('Which progression is this chart?')
      expect(question.view.value!.context).toBe('Key of C major')
      expect(question.view.value!.chart?.map((bar) => bar.voicing?.chord_voicing_id)).toEqual(
        (['C', 'G', 'Am', 'F'] as const).map((symbol) => drillVoicings[symbol].voicing.chord_voicing_id),
      )
      expect(question.view.value!.options.map((option) => option.label)).toEqual(['I–V–vi–IV (pop)', 'I–vi–IV–V (doo-wop)'])
      expect(question.grading.value).toEqual({
        question: { way: 'chart_to_numbers', key: 'C', progression: 'I-V-vi-IV' },
        catalog: { 'I-V-vi-IV': { bars: ['I', 'V', 'vi', 'IV'] }, 'I-vi-IV-V': { bars: ['I', 'vi', 'IV', 'V'] } },
      })
    })

    it('is unavailable when the catalog it is graded against can not be loaded', async () => {
      serve({ progressions: false })
      const question = setUp(read)
      await flushPromises()

      expect(question.status.value).toBe('unavailable')
    })

    it('asks for the chart of a progression named, offering the charts', async () => {
      const question = setUp(
        item('chart_progression:I-V-vi-IV', {
          way: 'numbers_to_chart',
          progression: { key: 'I-V-vi-IV', name: 'I–V–vi–IV (pop)' },
          options: [
            { value: 'G D Em C', name: null, chart: ['G', 'D', 'Em', 'C'] },
            { value: 'G Em C D', name: null, chart: ['G', 'Em', 'C', 'D'] },
          ],
        }),
      )
      await flushPromises()

      expect(question.prompt.value).toBe('Which chart is I–V–vi–IV (pop)?')
      expect(question.view.value!.options.map((option) => option.chart?.map((bar) => bar.symbol))).toEqual([
        ['G', 'D', 'Em', 'C'],
        ['G', 'Em', 'C', 'D'],
      ])
    })
  })

  describe('a heard chord', () => {
    type Playback = NonNullable<Question['playback']>
    type Bar = Playback['bars'][number]
    const playback = (bars: Bar[], bass = false): Playback => ({
      tempo_bpm: 70,
      bass_line: bass,
      bass_instrument_id: bass ? drillBass.instrument_id : null,
      bars,
    })
    const CADENCE: Bar[] = [
      { chord: 'G', numeral: 'I' },
      { chord: 'C', numeral: 'IV' },
      { chord: 'D', numeral: 'V' },
      { chord: 'G', numeral: 'I' },
      { chord: 'Em', numeral: null },
    ]
    const heard = (bars: Bar[], options: { bass?: boolean } = {}) =>
      item('heard_chord:vi', {
        way: 'cadence_then_chord',
        drawn_as: options.bass ? 'chord_symbols' : 'chord_boxes',
        playback: playback(bars, options.bass),
        voicings: boxes('G', 'C', 'D', 'Em'),
        options: chordOptions('ii', 'IV', 'V', 'vi'),
      })

    it('plays the cadence, then the chord, in the voicings it lists, and asks which chord was heard', async () => {
      const question = setUp(heard(CADENCE))
      await flushPromises()

      expect(question.status.value).toBe('ready')
      expect(question.prompt.value).toBe('Which chord do you hear?')
      const progression = question.view.value!.progression!
      expect(progression.bars).toEqual(['I', 'IV', 'V', 'I', null])
      expect(progression.subtitle).toBe('A cadence sets the key, then the chord')
      expect(progression.source.chords.map((diagram) => diagram.diagram_id)).toEqual((['G', 'C', 'D', 'G', 'Em'] as const).map(boxId))
      expect(progression.source.chordInstrument.instrument_id).toBe(drillVoicings.C.diagram.instrument_id)
      expect(progression.source.bass).toBeNull()
      expect(progression.source.tempoBpm).toBe(70)
      expect(question.view.value!.options.map((option) => option.label)).toEqual(['ii', 'IV', 'V', 'vi'])
      expect(question.grading.value).toEqual({ question: { way: 'cadence_then_chord', key: 'G', numeral: 'vi' }, catalog: {} })
    })

    it('says only the tonic sets the key once the student is accurate on it', async () => {
      const question = setUp(heard([CADENCE[0]!, CADENCE[4]!]))
      await flushPromises()

      expect(question.view.value!.progression!.bars).toEqual(['I', null])
      expect(question.view.value!.progression!.subtitle).toBe('The tonic sets the key, then the chord')
    })

    it('on bass, plays the chords’ roots under them on the bass the plan names', async () => {
      const question = setUp(heard(CADENCE, { bass: true }))
      await flushPromises()

      expect(question.view.value!.instrument).toBe('bass')
      expect(question.view.value!.progression!.source.bass).toEqual({ instrument: drillBass, roots: ['G', 'C', 'D', 'G', 'E'] })
    })

    it('is unavailable when the bass it plays on can’t be found, so it is skipped and never counted wrong', async () => {
      serve({ bass: false })
      const question = setUp(heard(CADENCE, { bass: true }))
      await flushPromises()

      expect(question.status.value).toBe('unavailable')
    })

    it('is unavailable when a chord it plays can’t be loaded', async () => {
      serve({ failing: [boxId('Em')] })
      const question = setUp(heard(CADENCE))
      await flushPromises()

      expect(question.status.value).toBe('unavailable')
    })

    it('asked by sight, shows the chord and asks its numeral in the key, as a numeral question does', () => {
      const question = setUp(item('heard_chord:vi', { way: 'see_then_name', chord: 'Em', options: chordOptions('vi', 'IV', 'viio', 'iii') }))

      expect(question.prompt.value).toBe('In G, which numeral is this chord?')
      expect(question.view.value!.chord?.symbol).toBe('Em')
      expect(question.view.value!.options.map((option) => option.label)).toEqual(['vi', 'IV', 'vii°', 'iii'])
      expect(question.grading.value.question).toEqual({ way: 'see_then_name', key: 'G', numeral: 'vi' })
    })
  })

  it('plays a heard progression with every bar hidden, offers the progressions by name, with the catalog to grade it', async () => {
    const question = setUp(
      item('heard_progression:I-V-vi-IV', {
        way: 'progression_by_number',
        drawn_as: 'chord_boxes',
        playback: { tempo_bpm: 90, bass_line: false, bass_instrument_id: null, bars: (['G', 'D', 'Em', 'C'] as const).map((chord) => ({ chord, numeral: null })) },
        voicings: boxes('G', 'D', 'Em', 'C'),
        options: [
          { value: 'I-V-vi-IV', name: 'I–V–vi–IV (pop)', chart: [] },
          { value: 'I-vi-IV-V', name: 'I–vi–IV–V (doo-wop)', chart: [] },
        ],
      }),
    )
    await flushPromises()

    expect(question.status.value).toBe('ready')
    expect(question.prompt.value).toBe('Which progression do you hear?')
    expect(question.view.value!.progression!.bars).toEqual([null, null, null, null])
    expect(question.view.value!.progression!.subtitle).toBe('Four chords, in a key you aren’t told')
    expect(question.view.value!.options.map((option) => option.label)).toEqual(['I–V–vi–IV (pop)', 'I–vi–IV–V (doo-wop)'])
    expect(question.grading.value).toEqual({
      question: { way: 'progression_by_number', key: 'G', progression: 'I-V-vi-IV' },
      catalog: { 'I-V-vi-IV': { bars: ['I', 'V', 'vi', 'IV'] }, 'I-vi-IV-V': { bars: ['I', 'vi', 'IV', 'V'] } },
    })
  })

  it('grades a numeral question by its key and numeral, with no catalog', () => {
    const question = setUp(item('diatonic_chord:G:vi', { way: 'numeral_to_chord', numeral: 'vi', options: chordOptions('Em', 'D', 'F#dim', 'C') }))

    expect(question.grading.value).toEqual({ question: { way: 'numeral_to_chord', key: 'G', numeral: 'vi' }, catalog: {} })
  })
})
