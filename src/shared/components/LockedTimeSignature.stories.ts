import type { Meta, StoryObj } from '@storybook/vue3-vite'

import LockedTimeSignature from './LockedTimeSignature.vue'

const meta = {
  title: 'Practice/LockedTimeSignature',
  component: LockedTimeSignature,
  args: { signature: { beats: 4, beat_value: 4 }, setBy: 'diagram' },
} satisfies Meta<typeof LockedTimeSignature>

export default meta
type Story = StoryObj<typeof meta>

/** Under a play-along's metronome: the diagram sets the bar. */
export const SetByTheDiagram: Story = {}

/** In a progression's Tempo sheet. */
export const OneChordABar: Story = { args: { setBy: 'progression' } }
