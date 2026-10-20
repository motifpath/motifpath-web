import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ItemHeader from './ItemHeader.vue'

const meta = {
  title: 'Practice/ItemHeader',
  component: ItemHeader,
  args: { title: 'Hear the third', reason: 'due' },
} satisfies Meta<typeof ItemHeader>

export default meta
type Story = StoryObj<typeof meta>

/** An exercise, named by its title. */
export const Exercise: Story = {}

/** A fretboard cell: its prompt is its title. */
export const FretboardCell: Story = { args: { title: 'Name this note', reason: 'new' } }

/** A long name wraps instead of truncating. */
export const LongTitle: Story = { args: { title: 'Tríades maiores e menores em todas as regiões do braço', reason: 'application' } }

/** A lesson's challenge exercise: no session picked it, so a tag says what it is. */
export const Challenge: Story = { args: { title: 'Inversions of C major', reason: undefined, tag: 'Challenge' } }
