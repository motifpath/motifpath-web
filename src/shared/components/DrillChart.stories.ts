import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { drillGuitar, drillVoicings } from '@/shared/testUtils/drill'

import DrillChart from './DrillChart.vue'

const { C, G, Am, F } = drillVoicings

const meta = {
  title: 'Practice/DrillChart',
  component: DrillChart,
  args: { bars: [C, G, Am, F].map((chord) => ({ kind: 'box' as const, ...chord })), instrument: drillGuitar },
  render: (args) => ({
    components: { DrillChart },
    setup: () => ({ args }),
    template: '<div class="w-[342px]"><DrillChart v-bind="args" /></div>',
  }),
} satisfies Meta<typeof DrillChart>

export default meta
type Story = StoryObj<typeof meta>

/** Read the chart on guitar: four boxes in C, none of them named. */
export const Boxes: Story = {}

/** Read the chart on bass: four chord symbols in G. */
export const Symbols: Story = { args: { bars: ['G', 'Em', 'C', 'D'].map((symbol) => ({ kind: 'symbol' as const, symbol })) } }
