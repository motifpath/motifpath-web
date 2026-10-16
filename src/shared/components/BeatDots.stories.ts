import type { Meta, StoryObj } from '@storybook/vue3-vite'

import BeatDots from './BeatDots.vue'

const meta = {
  title: 'Practice/BeatDots',
  component: BeatDots,
  args: { beats: 4, lit: null },
} satisfies Meta<typeof BeatDots>

export default meta
type Story = StoryObj<typeof meta>

/** Silent: the downbeat larger, so the bar reads without colour. */
export const Silent: Story = {}

/** The second beat sounding. */
export const Playing: Story = { args: { lit: 1 } }

/** The longest bar wraps rather than overflowing a phone. */
export const TwelveEight: Story = { args: { beats: 12, lit: 0 } }
