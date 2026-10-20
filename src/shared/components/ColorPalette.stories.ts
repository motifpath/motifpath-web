import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ColorPalette from './ColorPalette.vue'

const meta = {
  title: 'Selection/ColorPalette',
  component: ColorPalette,
  args: { modelValue: null },
} satisfies Meta<typeof ColorPalette>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const NoClear: Story = { args: { allowClear: false } }
