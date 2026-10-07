import type { Meta, StoryObj } from '@storybook/vue3-vite'

import SignOutLink from './SignOutLink.vue'

const meta: Meta<typeof SignOutLink> = {
  title: 'Actions/SignOutLink',
  component: SignOutLink,
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const CustomLabel: Story = { args: { label: 'Leave' } }
