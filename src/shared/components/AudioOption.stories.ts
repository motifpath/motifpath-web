import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AudioOption from './AudioOption.vue'

const meta = {
  title: 'Practice/AudioOption',
  component: AudioOption,
  args: { label: 'Sound 1' },
} satisfies Meta<typeof AudioOption>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Playing: Story = { args: { playing: true } }
export const Selected: Story = { args: { state: 'selected' } }
export const Right: Story = { args: { state: 'right' } }
export const Wrong: Story = { args: { state: 'wrong' } }
export const Locked: Story = { args: { state: 'locked' } }
