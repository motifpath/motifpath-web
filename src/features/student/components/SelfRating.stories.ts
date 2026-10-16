import type { Meta, StoryObj } from '@storybook/vue3-vite'

import SelfRating from './SelfRating.vue'

const meta = {
  title: 'Practice/SelfRating',
  component: SelfRating,
  args: { bpm: 72, noteValue: 'quarters' },
} satisfies Meta<typeof SelfRating>

export default meta
type Story = StoryObj<typeof meta>

/** After a take: the rating replaces the action bar, keys 1–3 rate it. */
export const AfterATake: Story = {}

/** A take played faster than the goal. */
export const FastTake: Story = { args: { bpm: 180 } }

/** A take in eighths: the prompt says the note value it was played at. */
export const InEighths: Story = { args: { bpm: 60, noteValue: 'eighths' } }
