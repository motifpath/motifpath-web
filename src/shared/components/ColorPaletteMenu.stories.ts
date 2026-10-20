import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ColorPaletteMenu from './ColorPaletteMenu.vue'

const meta = {
  title: 'Selection/ColorPaletteMenu',
  component: ColorPaletteMenu,
  args: { title: 'Marker colour', testId: 'marker-colour', modelValue: null, hint: 'Colours mark roles, like the root.' },
} satisfies Meta<typeof ColorPaletteMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
