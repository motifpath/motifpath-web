import type { Meta, StoryObj } from '@storybook/vue3-vite'

import FirstPathBar from './FirstPathBar.vue'

const meta = {
  title: 'Engagement/FirstPathBar',
  component: FirstPathBar,
  args: { percent: 61, label: '11 of 18 nodes · 61%' },
} satisfies Meta<typeof FirstPathBar>

export default meta
type Story = StoryObj<typeof meta>

export const BelowTarget: Story = {}
export const OverTarget: Story = { args: { percent: 78, label: '14 of 18 nodes · 78%' } }
export const NotStarted: Story = { args: { percent: 0, label: '0 of 18 nodes · 0%' } }
export const Dark: Story = { globals: { theme: 'dark' } }
