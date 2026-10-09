import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ChoiceChip from './ChoiceChip.vue'

const meta = {
  title: 'Selection/ChoiceChip',
  component: ChoiceChip,
  args: { label: "The video won't play", selected: false },
} satisfies Meta<typeof ChoiceChip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Selected: Story = { args: { selected: true } }
export const LongPortuguese: Story = { args: { label: 'O vídeo não carrega', selected: true } }
