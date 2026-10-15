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

/** "In D, A7 is…" Naming the chord is fine: its function is asked. */
export const ChordToFunction: Story = { args: { view: { way: 'chord_to_function', instrument: 'guitar', chord: chord('A7'), options: FUNCTIONS } } }

/** "In D, which chord pulls home?" Unnamed boxes, like picking the chord for a numeral. */
export const FunctionToChord: Story = { args: { view: { way: 'function_to_chord', instrument: 'guitar', options: chordOptions('D', 'G', 'A7', 'Em') } } }

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

/** Bass, function to chord: chord symbols to pick from. */
export const BassFunctionToChord: Story = {
  args: { instrument: drillBass, view: { way: 'function_to_chord', instrument: 'bass', options: textOptions('D', 'G', 'A7', 'Em') } },
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
      chord: chord('A7'),
      context: 'Em Ré maior, pense no papel que este acorde cumpre na progressão.',
      options: [
        { value: 'tonic', label: 'Tônica — repouso, a sensação de ter chegado em casa' },
        { value: 'subdominant', label: 'Subdominante — se afasta da tônica' },
        { value: 'dominant', label: 'Dominante — puxa de volta para casa' },
      ],
    },
  },
}
