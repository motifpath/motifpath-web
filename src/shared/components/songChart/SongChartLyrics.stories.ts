import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeLearnerSongChart } from '@/shared/testUtils/songChart'

import SongChartLyrics from './SongChartLyrics.vue'

const meta = {
  title: 'Song charts/SongChartLyrics',
  component: SongChartLyrics,
  args: { body: makeLearnerSongChart().body },
  parameters: { docs: { description: { component: "A song chart's sections as written, each chord over the word it falls on." } } },
} satisfies Meta<typeof SongChartLyrics>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Tappable: Story = {
  args: { isTappable: () => true, selectedAnchorId: 'a1' },
  parameters: { docs: { description: { story: 'In the reader, a chord with something to show is a button; the one shown is pressed.' } } },
}
