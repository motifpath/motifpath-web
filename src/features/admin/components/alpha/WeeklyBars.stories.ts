import type { Meta, StoryObj } from '@storybook/vue3-vite'

import WeeklyBars from './WeeklyBars.vue'

const meta = {
  title: 'Engagement/WeeklyBars',
  component: WeeklyBars,
  args: {
    weeks: [
      { week_start: '2026-08-24', finished_sessions: 1 },
      { week_start: '2026-08-31', finished_sessions: 3 },
      { week_start: '2026-09-07', finished_sessions: 4 },
      { week_start: '2026-09-14', finished_sessions: 3 },
      { week_start: '2026-09-21', finished_sessions: 0 },
      { week_start: '2026-09-28', finished_sessions: 3 },
      { week_start: '2026-10-05', finished_sessions: 6 },
    ],
    weeksAtTarget: 5,
    weeksSoFar: 7,
  },
} satisfies Meta<typeof WeeklyBars>

export default meta
type Story = StoryObj<typeof meta>

export const SevenWeeks: Story = {}
export const NoWeekYet: Story = { args: { weeks: [], weeksAtTarget: 0, weeksSoFar: 0 } }
export const Dark: Story = { globals: { theme: 'dark' } }
