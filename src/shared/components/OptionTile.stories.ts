import type { Meta, StoryObj } from '@storybook/vue3-vite'

import OptionTile from './OptionTile.vue'

const meta = {
  title: 'Practice/OptionTile',
  component: OptionTile,
  args: { keyHint: 1, label: 'Minor third' },
} satisfies Meta<typeof OptionTile>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Selected: Story = { args: { state: 'selected' } }
export const Right: Story = { args: { state: 'right' } }
export const Wrong: Story = { args: { state: 'wrong', keyHint: 2, label: 'Major third' } }
export const Locked: Story = { args: { state: 'locked', keyHint: 3, label: 'Perfect fourth' } }
export const LongPortuguese: Story = { args: { keyHint: 4, label: 'Terça menor acima da fundamental, na segunda inversão' } }
