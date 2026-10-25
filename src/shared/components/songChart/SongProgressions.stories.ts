import type { Meta, StoryObj } from '@storybook/vue3-vite'

import SongProgressions from './SongProgressions.vue'

const meta = {
  title: 'Song charts/SongProgressions',
  component: SongProgressions,
  args: { keys: ['I-IV-I-V', 'ii-V-I'] },
  parameters: { docs: { description: { component: 'The progressions in this song, each once, under the chords in this song.' } } },
} satisfies Meta<typeof SongProgressions>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
