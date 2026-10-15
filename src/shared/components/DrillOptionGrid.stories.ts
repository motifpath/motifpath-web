import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import { ref } from 'vue'

import { drillGuitar, drillVoicings } from '@/shared/testUtils/drill'

import DrillOptionGrid from './DrillOptionGrid.vue'
import type { DrillOption } from './DrillOptionGrid.vue'

const numerals = (...values: string[]): DrillOption[] => values.map((value) => ({ value, label: value }))
const chords = (...symbols: (keyof typeof drillVoicings)[]): DrillOption[] => symbols.map((symbol) => ({ value: symbol, label: symbol, chord: drillVoicings[symbol] }))

const meta = {
  title: 'Practice/DrillOptionGrid',
  component: DrillOptionGrid,
  args: { kind: 'text', options: numerals('ii', 'iii', 'IV', 'vi'), instrument: drillGuitar, reveal: null, locked: false, choice: null },
  render: (args) => ({
    components: { DrillOptionGrid },
    setup: () => ({ args, choice: ref(args.choice) }),
    template: '<div class="w-[342px]"><DrillOptionGrid v-bind="args" v-model:choice="choice" /></div>',
  }),
} satisfies Meta<typeof DrillOptionGrid>

export default meta
type Story = StoryObj<typeof meta>

/** Name the numeral: numerals near the answer. */
export const Numerals: Story = {}

/** Chord function: the three functions. */
export const Functions: Story = {
  args: {
    options: [
      { value: 'tonic', label: 'Tonic — at rest' },
      { value: 'subdominant', label: 'Subdominant — moves away' },
      { value: 'dominant', label: 'Dominant — pulls home' },
    ],
  },
}

/** Pick the chord on guitar: four boxes of the key, none named, none marked. */
export const ChordBoxes: Story = { args: { kind: 'chord_box', options: chords('C', 'Em', 'Am', 'D') } }

/** The answer is in: the boxes are named, the pick and the right one marked. */
export const ChordBoxesAnswered: Story = { args: { kind: 'chord_box', options: chords('C', 'Em', 'Am', 'D'), choice: 'C', reveal: { right: 'Em' } } }

/** Pick the chord on bass: chord symbols. */
export const ChordSymbols: Story = { args: { kind: 'chord_symbol', options: numerals('C', 'Em', 'Am', 'D') } }

/** Read the chart: the progression and its confusables. */
export const Progressions: Story = { args: { options: numerals('I – V – vi – IV', 'I – vi – IV – V', 'vi – IV – I – V', 'I – IV – vi – V') } }

/** The sound is missing: nothing takes an answer. */
export const Locked: Story = { args: { locked: true } }

/** A number key answers. */
export const KeyAnswers: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.keyboard('3')
    await expect(canvas.getAllByRole('button')[2]).toHaveAttribute('aria-pressed', 'true')
  },
}

export const LongPortuguese: Story = {
  args: {
    options: [
      { value: 'tonic', label: 'Tônica — repouso, a sensação de ter chegado em casa' },
      { value: 'subdominant', label: 'Subdominante — se afasta da tônica' },
      { value: 'dominant', label: 'Dominante — puxa de volta para casa' },
    ],
  },
}
