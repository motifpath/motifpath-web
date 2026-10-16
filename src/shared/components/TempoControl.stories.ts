import type { Meta, StoryObj } from '@storybook/vue3-vite'

import TempoControl from './TempoControl.vue'
import { ALL_NOTE_VALUES, SUGGESTED_NOTE_VALUES } from '@/shared/utils/tempoNoteValue'

const meta = {
  title: 'Practice/TempoControl',
  component: TempoControl,
  args: { tempo: 72, slowest: 55, goal: 96, best: 68, metronome: true, disabled: false },
} satisfies Meta<typeof TempoControl>

export default meta
type Story = StoryObj<typeof meta>

/** Before a take: slide, or tap the value to type an exact tempo. */
export const Ready: Story = {}

/** Before the first clean take only the goal is marked. */
export const NoBestYet: Story = { args: { best: null } }

/** The metronome off. */
export const MetronomeOff: Story = { args: { metronome: false } }

/** While a take plays, nothing changes. */
export const Playing: Story = { args: { disabled: true } }

/** A play-along or a drill: the note value beside the tempo, the four suggested ones on demand. */
export const WithNoteValue: Story = { args: { noteValue: 'eighths', noteValues: SUGGESTED_NOTE_VALUES } }

/** The Metronome tool: no ladder, every note value. */
export const Tool: Story = {
  args: { tempo: 80, slowest: 20, goal: null, best: null, metronome: false, noteValue: 'quarters', noteValues: ALL_NOTE_VALUES },
}
