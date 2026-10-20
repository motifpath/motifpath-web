import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Crosshair } from 'lucide-vue-next'

import TypeRow from './TypeRow.vue'

const meta = {
  title: 'Teach/TypeRow',
  component: TypeRow,
  args: { icon: Crosshair, label: 'Image recognition', description: 'Taps the right place on an image or a diagram.' },
} satisfies Meta<typeof TypeRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
