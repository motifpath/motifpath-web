import type { Meta, StoryObj } from '@storybook/vue3-vite'

import LoadingSkeleton from './LoadingSkeleton.vue'

const meta = {
  title: 'States/LoadingSkeleton',
  component: LoadingSkeleton,
} satisfies Meta<typeof LoadingSkeleton>

export default meta
type Story = StoryObj<typeof meta>

/** Placeholders appear after 300 ms, so a fast load never flashes them. */
export const Cards: Story = {}
export const Lines: Story = { args: { shape: 'lines', count: 4 } }
/** A video lesson loading: the player's frame, then its title block. */
export const Video: Story = { args: { shape: 'video' } }
