import type { Meta, StoryObj } from '@storybook/vue3-vite'

import WeekSummary from './WeekSummary.vue'

const meta = {
  title: 'Engagement/WeekSummary',
  component: WeekSummary,
  args: { sessions: 2, weeksAtTarget: 3, weeksSoFar: 3, percent: 61 },
  globals: { viewport: { value: 'compact' } },
} satisfies Meta<typeof WeekSummary>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const LongPortuguese: Story = { globals: { locale: 'pt-BR' } }
export const Dark: Story = { globals: { theme: 'dark' } }
