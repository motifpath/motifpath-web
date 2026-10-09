import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { failing, notFound } from '@/shared/testUtils/msw/handlers'

import SongChartScreen from './SongChartScreen.vue'

const meta = {
  title: 'Song charts/SongChartScreen',
  component: SongChartScreen,
  args: { songChartId: '00000000-0000-4000-8000-000000000001' },
  parameters: {
    docs: { description: { component: 'A published song chart on the whole screen, with a close control. It loads the chart itself.' } },
  },
} satisfies Meta<typeof SongChartScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Failed: Story = { parameters: { msw: { handlers: { publishedSongChart: failing('publishedSongChart') } } } }
export const NotFound: Story = { parameters: { msw: { handlers: { publishedSongChart: notFound('publishedSongChart') } } } }
