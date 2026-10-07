import type { Meta, StoryObj } from '@storybook/vue3-vite'

import LevelPicker from './LevelPicker.vue'

const meta = {
  title: 'Selection/LevelPicker',
  component: LevelPicker,
  args: { modelValue: 'beginner', label: 'Level' },
} satisfies Meta<typeof LevelPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const NoneChosen: Story = { args: { modelValue: null } }
export const Disabled: Story = { args: { disabled: true } }
