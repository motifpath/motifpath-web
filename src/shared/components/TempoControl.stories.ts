import type { Meta, StoryObj } from '@storybook/vue3-vite'

import TempoControl from './TempoControl.vue'

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
