import type { Meta, StoryObj } from '@storybook/vue3-vite'

import FocusCard from './FocusCard.vue'

const meta = {
  title: 'Cards & progress/FocusCard',
  component: FocusCard,
  // A list item: it only renders inside the list its caller provides.
  decorators: [() => ({ template: '<ul><story /></ul>' })],
  args: {
    position: 4,
    eyebrow: 'Up next',
    title: 'Inversions',
    subtitle: 'Lesson · 8 min',
    ctaLabel: 'Start',
    to: { name: 'path' },
  },
} satisfies Meta<typeof FocusCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const LongPortuguese: Story = {
  args: { eyebrow: 'A seguir', title: 'Inversões de tríades nas quatro cordas agudas', subtitle: 'Aula · 8 min', ctaLabel: 'Começar' },
}
