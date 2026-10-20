import type { Meta, StoryObj } from '@storybook/vue3-vite'

import DiagramLegend from './DiagramLegend.vue'

const meta = {
  title: 'Diagrams/DiagramLegend',
  component: DiagramLegend,
  args: {
    entries: [
      { names: { en: 'A minor pentatonic' }, color: null },
      { names: { en: 'C major triad' }, color: '#14B8A6' },
    ],
  },
} satisfies Meta<typeof DiagramLegend>

export default meta
type Story = StoryObj<typeof meta>

/** Two diagrams on one board: the default hue, then a stack hue. */
export const TwoDiagrams: Story = {}

/** Three, the last in the next stack hue. */
export const ThreeDiagrams: Story = {
  args: {
    entries: [
      { names: { en: 'A minor pentatonic' }, color: null },
      { names: { en: 'C major triad' }, color: '#14B8A6' },
      { names: { en: 'Blue note' }, color: '#F59E0B' },
    ],
  },
}
