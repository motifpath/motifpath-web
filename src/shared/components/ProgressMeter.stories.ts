import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ProgressMeter from './ProgressMeter.vue'

const meta = {
  title: 'Cards & progress/ProgressMeter',
  component: ProgressMeter,
  args: { completed: 3, total: 10 },
} satisfies Meta<typeof ProgressMeter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { args: { completed: 0, total: 0 } }
export const Complete: Story = { args: { completed: 10, total: 10 } }
export const WithoutCount: Story = { args: { completed: 7, total: 14, showCount: false } }
