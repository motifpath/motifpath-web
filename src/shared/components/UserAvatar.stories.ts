import type { Meta, StoryObj } from '@storybook/vue3-vite'

import UserAvatar from './UserAvatar.vue'

const meta = {
  title: 'Navigation/UserAvatar',
  component: UserAvatar,
  args: { initial: 'G' },
} satisfies Meta<typeof UserAvatar>

export default meta
type Story = StoryObj<typeof meta>

export const Small: Story = {}
export const Medium: Story = { args: { size: 'md' } }
