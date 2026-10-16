import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import { drillBass, drillGuitar, drillVoicings } from '@/shared/testUtils/drill'
import type { DrillChordSymbol } from '@/shared/testUtils/drill'

import DrillQuestion from './DrillQuestion.vue'
import type { DrillChord, DrillQuestionOption, DrillQuestionView } from './DrillQuestion.vue'

// Every story is a question as a plan would give it: no story adds a component of its own.

const chord = (symbol: DrillChordSymbol): DrillChord => ({ symbol, ...drillVoicings[symbol] })
const chordOptions = (...symbols: DrillChordSymbol[]): DrillQuestionOption[] => symbols.map((symbol) => ({ value: symbol, label: symbol, chord: chord(symbol) }))
const textOptions = (...values: string[]): DrillQuestionOption[] => values.map((value) => ({ value, label: value }))
const progressionOptions = (...keys: string[]): DrillQuestionOption[] => keys.map((key) => ({ value: key, label: key.split('-').join(' – ') }))
const playing = (...symbols: DrillChordSymbol[]) => symbols.map((symbol) => drillVoicings[symbol].diagram)

const FUNCTIONS: DrillQuestionOption[] = [
  { value: 'tonic', label: 'Tonic — at rest' },
  { value: 'subdominant', label: 'Subdominant — moves away' },
  { value: 'dominant', label: 'Dominant — pulls home' },
]

const numeralToChord: DrillQuestionView = {
  way: 'numeral_to_chord',
  instrument: 'guitar',
  context: 'All four are chords of G major.',
  options: chordOptions('C', 'Em', 'Am', 'D'),
}

const meta = {
  title: 'Practice/DrillQuestion',
  component: DrillQuestion,
  args: { view: numeralToChord, instrument: drillGuitar, reveal: null, choice: null },
  render: (args) => ({
    components: { DrillQuestion },
    setup: () => ({ args, choice: ref(args.choice) }),
    template: '<div class="w-[342px]"><DrillQuestion v-bind="args" v-model:choice="choice" /></div>',
  }),
} satisfies Meta<typeof DrillQuestion>

export default meta
type Story = StoryObj<typeof meta>

/** "In G, which chord is vi?" Four unnamed boxes of the key. */
export const NumeralToChord: Story = {}

/** The answer is in: the boxes are named, the pick and the right one marked. */
export const NumeralToChordAnswered: Story = { args: { choice: 'C', reveal: { right: 'Em' } } }

/** "In G, which numeral is this chord?" The box is never named. */
export const ChordToNumeral: Story = { args: { view: { way: 'chord_to_numeral', instrument: 'guitar', chord: chord('Bm'), options: textOptions('ii', 'iii', 'IV', 'vi') } } }

/** "In G, what does D do?" The key's triad, never a seventh, which would give the dominant away. */
export const ChordToFunction: Story = { args: { view: { way: 'chord_to_function', instrument: 'guitar', chord: chord('D'), options: FUNCTIONS } } }

/** "In G, which chord pulls home?" Unnamed boxes; only one of them is dominant. */
export const FunctionToChord: Story = {
  args: { view: { way: 'function_to_chord', instrument: 'guitar', context: 'All four are chords of G major.', options: chordOptions('D', 'C', 'Em', 'G') } },
}

const BLUES = ['G7', 'G7', 'G7', 'G7', 'C7', 'C7', 'G7', 'G7', 'D7', 'C7', 'G7', 'D7']
const QUICK_CHANGE = ['G7', 'C7', ...BLUES.slice(2)]
const symbolChart = (symbols: string[]): DrillChord[] => symbols.map((symbol) => ({ symbol }))
const chartOption = (chart: DrillChord[]): DrillQuestionOption => ({ value: chart.map((bar) => bar.symbol).join(' '), label: chart.map((bar) => bar.symbol).join(' '), chart })

/** Pick the chart: "Which chart is I – V – vi – IV?" in G, one row of unnamed boxes per option. */
export const NumbersToChart: Story = {
  args: {
    view: {
      way: 'numbers_to_chart',
      instrument: 'guitar',
      context: 'Key of G major',
      options: [
        chartOption((['G', 'Em', 'C', 'D'] as const).map(chord)),
        chartOption((['G', 'D', 'Em', 'C'] as const).map(chord)),
        chartOption((['Em', 'C', 'G', 'D'] as const).map(chord)),
        chartOption((['G', 'Em', 'Am', 'D'] as const).map(chord)),
      ],
    },
  },
}

/** Read a 12-bar chart: chord symbols on every instrument, three lines of four. */
export const TwelveBarChartToNumbers: Story = {
  args: {
    instrument: null,
    view: {
      way: 'chart_to_numbers',
      instrument: 'bass',
      context: 'Key of G major',
      chart: symbolChart(BLUES),
      options: [
        { value: '12-bar-blues-quick-change', label: '12-bar blues, quick change' },
        { value: '12-bar-blues', label: '12-bar blues, slow change' },
      ],
    },
  },
}

/** Pick a 12-bar chart: two charts that differ only in bar 2. */
export const TwelveBarNumbersToChart: Story = {
  args: { instrument: null, view: { way: 'numbers_to_chart', instrument: 'bass', context: 'Key of G major', options: [chartOption(symbolChart(BLUES)), chartOption(symbolChart(QUICK_CHANGE))] } },
}

/** Read the chart: four unnamed boxes in a key, pick the progression. */
export const ChartToNumbers: Story = {
  args: {
    view: {
      way: 'chart_to_numbers',
      instrument: 'guitar',
      context: 'Key of C major',
      chart: (['C', 'G', 'Am', 'F'] as const).map(chord),
      options: progressionOptions('I-V-vi-IV', 'I-vi-IV-V', 'vi-IV-I-V', 'I-IV-vi-V'),
    },
  },
}

/** Hear the chord: a cadence sets the key, then the chord plays. */
export const CadenceThenChord: Story = {
  args: {
    view: {
      way: 'cadence_then_chord',
      instrument: 'guitar',
      progression: {
        source: { chords: playing('G', 'C', 'D', 'G', 'Em'), chordInstrument: drillGuitar, bass: null, tempoBpm: 72 },
        bars: ['I', 'IV', 'V', 'I', null],
        subtitle: 'A cadence sets the key, then the chord',
      },
      options: textOptions('ii', 'IV', 'V', 'vi'),
    },
  },
}

/** Hear the chord, accurate on it: only the tonic sets the key. */
export const TonicThenChord: Story = {
  args: {
    view: {
      way: 'cadence_then_chord',
      instrument: 'guitar',
      progression: {
        source: { chords: playing('G', 'Em'), chordInstrument: drillGuitar, bass: null, tempoBpm: 72 },
        bars: ['I', null],
        subtitle: 'The tonic sets the key, then the chord',
      },
      options: textOptions('iii', 'IV', 'V', 'vi'),
    },
  },
}

/** Hear the progression: four chords in a key the student isn't told. */
export const ProgressionByNumber: Story = {
  args: {
    view: {
      way: 'progression_by_number',
      instrument: 'guitar',
      progression: {
        source: { chords: playing('G', 'D', 'Em', 'C'), chordInstrument: drillGuitar, bass: null, tempoBpm: 72 },
        bars: [null, null, null, null],
        subtitle: 'Four chords, in a key you aren’t told',
      },
      options: progressionOptions('I-V-vi-IV', 'I-vi-IV-V', 'vi-IV-I-V', 'I-IV-vi-V'),
    },
  },
}

/** Bass, chord to numeral: the chord symbol and the key. */
export const BassChordToNumeral: Story = {
  args: { instrument: drillBass, view: { way: 'chord_to_numeral', instrument: 'bass', chord: { symbol: 'Bm' }, options: textOptions('ii', 'iii', 'V', 'vi') } },
}

/** Bass, numeral to chord: "In G, which chord is vi?", chord symbols to pick from. */
export const BassNumeralToChord: Story = {
  args: { instrument: null, view: { way: 'numeral_to_chord', instrument: 'bass', context: 'All four are chords of G major.', options: textOptions('C', 'Em', 'Am', 'D').map((option) => ({ ...option, chord: { symbol: option.value } })) } },
}

/** Bass, chord to function: the chord's symbol, then the three functions. */
export const BassChordToFunction: Story = {
  args: { instrument: null, view: { way: 'chord_to_function', instrument: 'bass', chord: { symbol: 'D' }, options: FUNCTIONS } },
}

/** Bass, pick the chart: charts of chord symbols. */
export const BassNumbersToChart: Story = {
  args: {
    instrument: null,
    view: {
      way: 'numbers_to_chart',
      instrument: 'bass',
      context: 'Key of G major',
      options: [symbolChart(['G', 'Em', 'C', 'D']), symbolChart(['G', 'D', 'Em', 'C']), symbolChart(['Em', 'C', 'G', 'D']), symbolChart(['G', 'Em', 'Am', 'D'])].map(chartOption),
    },
  },
}

/** Bass, function to chord: chord symbols to pick from. */
export const BassFunctionToChord: Story = {
  args: { instrument: drillBass, view: { way: 'function_to_chord', instrument: 'bass', options: textOptions('D', 'C', 'Em', 'G') } },
}

/** Bass, read the chart: four chord symbols in a key. */
export const BassChartToNumbers: Story = {
  args: {
    instrument: drillBass,
    view: {
      way: 'chart_to_numbers',
      instrument: 'bass',
      context: 'Key of G major',
      chart: ['G', 'Em', 'C', 'D'].map((symbol) => ({ symbol })),
      options: progressionOptions('I-vi-IV-V', 'I-V-vi-IV', 'vi-IV-I-V', 'I-IV-vi-V'),
    },
  },
}

/** Bass, hear the chord: the same cadence, with a bass line under the chords. */
export const BassCadenceThenChord: Story = {
  args: {
    instrument: drillBass,
    view: {
      way: 'cadence_then_chord',
      instrument: 'bass',
      progression: {
        source: { chords: playing('G', 'C', 'D', 'G', 'Em'), chordInstrument: drillGuitar, bass: { instrument: drillBass, roots: ['G', 'C', 'D', 'G', 'E'] }, tempoBpm: 72 },
        bars: ['I', 'IV', 'V', 'I', null],
        subtitle: 'A cadence sets the key, then the chord',
      },
      options: textOptions('ii', 'IV', 'V', 'vi'),
    },
  },
}

/** A box the question must draw came without its voicing: nothing is named, nothing takes an answer. */
export const Unavailable: Story = { args: { view: { way: 'chord_to_numeral', instrument: 'guitar', chord: { symbol: 'Bm' }, options: textOptions('ii', 'iii', 'IV', 'vi') } } }

export const LongPortuguese: Story = {
  args: {
    view: {
      way: 'chord_to_function',
      instrument: 'guitar',
      chord: chord('D'),
      context: 'Em Sol maior, pense no papel que este acorde cumpre na progressão.',
      options: [
        { value: 'tonic', label: 'Tônica — repouso, a sensação de ter chegado em casa' },
        { value: 'subdominant', label: 'Subdominante — se afasta da tônica' },
        { value: 'dominant', label: 'Dominante — puxa de volta para casa' },
      ],
    },
  },
}
