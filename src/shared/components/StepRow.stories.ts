import type { Meta, StoryObj } from '@storybook/vue3-vite'

import StepRow from './StepRow.vue'

const meta = {
  title: 'Cards & progress/StepRow',
  component: StepRow,
  args: { position: 3, default: 'Triads on the neck' },
} satisfies Meta<typeof StepRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Emphasis: Story = { args: { emphasis: true } }
export const Muted: Story = { args: { muted: true } }
export const Card: Story = { args: { card: true } }
export const LongPortuguese: Story = { args: { card: true, default: 'Tríades maiores e menores em todas as regiões do braço do violão' } }
