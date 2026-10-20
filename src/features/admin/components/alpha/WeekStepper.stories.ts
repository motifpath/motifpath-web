import type { Meta, StoryObj } from '@storybook/vue3-vite'

import WeekStepper from './WeekStepper.vue'

const meta = {
  title: 'Engagement/WeekStepper',
  component: WeekStepper,
  args: { label: 'This week · 12–18 Oct', canGoNext: false },
} satisfies Meta<typeof WeekStepper>

export default meta
type Story = StoryObj<typeof meta>

export const RunningWeek: Story = {}
export const EarlierWeek: Story = { args: { label: '28 Sep – 4 Oct', canGoNext: true } }
export const LongPortuguese: Story = { args: { label: 'Semana passada · 5–11 out.', canGoNext: true }, globals: { locale: 'pt-BR' } }
export const Dark: Story = { globals: { theme: 'dark' } }
