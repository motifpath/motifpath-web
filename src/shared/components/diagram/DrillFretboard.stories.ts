import type { Meta, StoryObj } from '@storybook/vue3-vite'

import DrillFretboard from './DrillFretboard.vue'

const meta = {
  title: 'Diagrams/DrillFretboard',
  component: DrillFretboard,
  args: { tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], maxFret: 12, label: 'Find the note on the fretboard' },
} satisfies Meta<typeof DrillFretboard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Lit: Story = { args: { lit: { string: 3, fret: 5 } } }
export const AskedString: Story = { args: { askedString: 5 } }
export const Marked: Story = {
  args: { locked: true, marks: [{ string: 3, fret: 5, mark: 'right' }, { string: 2, fret: 3, mark: 'wrong' }] },
}
