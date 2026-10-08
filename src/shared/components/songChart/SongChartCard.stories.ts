import type { Meta, StoryObj } from '@storybook/vue3-vite'

import SongChartCard from './SongChartCard.vue'

const meta = {
  title: 'Song charts/SongChartCard',
  component: SongChartCard,
  args: { songChartId: '00000000-0000-4000-8000-000000000001' },
  parameters: {
    docs: {
      description: {
        component:
          'A published song chart embedded in content: title, artist, key and the first line with its chords. It loads the chart itself, and shows nothing until it has.',
      },
    },
  },
} satisfies Meta<typeof SongChartCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
