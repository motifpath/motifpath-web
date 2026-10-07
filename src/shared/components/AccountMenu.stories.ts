import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AccountMenu from './AccountMenu.vue'

const meta = {
  title: 'Navigation/AccountMenu',
  component: AccountMenu,
  render: () => ({ components: { AccountMenu }, template: '<div class="flex justify-end"><AccountMenu /></div>' }),
} satisfies Meta<typeof AccountMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
