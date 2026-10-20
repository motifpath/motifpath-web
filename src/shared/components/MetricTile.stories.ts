import type { Meta, StoryObj } from '@storybook/vue3-vite'

import MetricTile from './MetricTile.vue'

const meta = {
  title: 'Cards & progress/MetricTile',
  component: MetricTile,
  decorators: [() => ({ template: '<div class="w-40"><story /></div>' })],
  args: { label: 'Minutes', value: 48, caption: '+15 vs last wk', captionTone: 'positive', to: { name: 'home' } },
} satisfies Meta<typeof MetricTile>

export default meta
type Story = StoryObj<typeof meta>

export const Gain: Story = {}
export const FewerThanLastWeek: Story = { args: { value: 20, caption: '25 fewer than last wk', captionTone: 'neutral' } }
export const NoCaption: Story = { args: { label: 'Songs', value: 0, caption: undefined } }
export const NotALink: Story = { args: { to: undefined } }
export const LongPortuguese: Story = {
  args: { label: 'Dias seguidos', value: 3, caption: 'Recorde: 9', captionTone: 'neutral' },
  globals: { locale: 'pt-BR', theme: 'dark' },
}
