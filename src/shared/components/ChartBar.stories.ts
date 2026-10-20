import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { drillGuitar, drillVoicings } from '@/shared/testUtils/drill'

import ChartBar from './ChartBar.vue'

const meta = {
  title: 'Practice/ChartBar',
  component: ChartBar,
  args: { bar: { kind: 'box', ...drillVoicings.G }, position: 1, instrument: drillGuitar },
} satisfies Meta<typeof ChartBar>

export default meta
type Story = StoryObj<typeof meta>

/** Guitar reads the shape: a box with no name. */
export const Box: Story = {}

/** A box up the neck shows its first fret. */
export const BoxUpTheNeck: Story = { args: { bar: { kind: 'box', ...drillVoicings.Bm } } }

/** Bass reads cifra: the chord symbol. */
export const Symbol: Story = { args: { bar: { kind: 'symbol', symbol: 'Em' } } }
