import type { Meta, StoryObj } from '@storybook/vue3-vite'

import WeekDays from './WeekDays.vue'

// Thursday 2026-10-08 to Wednesday 2026-10-14, today.
const week = ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14']
const days = (marked: number[]) => week.map((date, index) => ({ date, marked: marked.includes(index) }))

const meta = {
  title: 'Cards & progress/WeekDays',
  component: WeekDays,
  decorators: [() => ({ template: '<div class="max-w-[22rem]"><story /></div>' })],
  args: { label: 'Practice days', markedLabel: 'practised', days: days([0, 2, 3, 5]) },
} satisfies Meta<typeof WeekDays>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Dark: Story = { globals: { theme: 'dark' } }
export const TodayPractised: Story = { args: { days: days([4, 5, 6]) } }
export const NothingYet: Story = { args: { days: days([]) } }
export const EveryDay: Story = { args: { days: days([0, 1, 2, 3, 4, 5, 6]) } }
export const Portuguese: Story = { args: { label: 'Dias de prática', markedLabel: 'praticou' }, globals: { locale: 'pt-BR', theme: 'dark' } }
