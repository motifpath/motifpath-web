import type { Meta, StoryObj } from '@storybook/vue3-vite'

import StatusChip from './StatusChip.vue'

const meta = {
  title: 'Cards & progress/StatusChip',
  component: StatusChip,
  args: { label: 'New' },
} satisfies Meta<typeof StatusChip>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = {}
export const Warning: Story = { args: { label: '2 fading — refresh them', tone: 'warning' } }
export const Accent: Story = { args: { label: 'Up next', tone: 'accent' } }
export const WarningDark: Story = { args: { label: '2 fading — refresh them', tone: 'warning' }, globals: { theme: 'dark' } }
