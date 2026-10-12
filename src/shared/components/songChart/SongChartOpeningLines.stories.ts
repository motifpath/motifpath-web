import type { Meta, StoryObj } from '@storybook/vue3-vite'

import SongChartOpeningLines from './SongChartOpeningLines.vue'

const meta = {
  title: 'Song charts/SongChartOpeningLines',
  component: SongChartOpeningLines,
  args: { songChartId: '00000000-0000-4000-8000-000000000001' },
  parameters: { docs: { description: { component: "How a published chart starts, beside the song chart picker's list." } } },
} satisfies Meta<typeof SongChartOpeningLines>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
