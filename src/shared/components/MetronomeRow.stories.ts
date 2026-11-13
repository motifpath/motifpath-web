import type { Meta, StoryObj } from '@storybook/vue3-vite'

import MetronomeRow from './MetronomeRow.vue'
import { SUGGESTED_NOTE_VALUES } from '@/shared/utils/tempoNoteValue'

const meta = {
  title: 'Practice/MetronomeRow',
  component: MetronomeRow,
  args: { beats: 4, lit: null, tempo: 60, slowest: 20, goal: 60, best: 50, metronome: true, disabled: false },
} satisfies Meta<typeof MetronomeRow>

export default meta
type Story = StoryObj<typeof meta>

/** Ready: the beat dots silent above the tempo control, the goal and the best clean tempo marked. */
export const Ready: Story = {}

/** While a take plays: the sounding beat lit, the tempo locked. */
export const Playing: Story = { args: { lit: 2, disabled: true } }

/** A drill whose note value the student picks, such as a play-along. */
export const WithNoteValue: Story = { args: { noteValue: 'quarters', noteValues: SUGGESTED_NOTE_VALUES } }

/** A bar of three, as a diagram in 3/4 plays it. */
export const ThreeBeats: Story = { args: { beats: 3, lit: 0 } }
