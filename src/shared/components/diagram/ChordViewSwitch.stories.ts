import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ChordViewSwitch from './ChordViewSwitch.vue'

const meta = {
  title: 'Diagrams/ChordViewSwitch',
  component: ChordViewSwitch,
  args: { modelValue: 'box' },
} satisfies Meta<typeof ChordViewSwitch>

export default meta
type Story = StoryObj<typeof meta>

/** A chord voicing's default: the chord box. */
export const Box: Story = {}

/** The student switched to the fretboard. */
export const Neck: Story = { args: { modelValue: 'neck' } }
