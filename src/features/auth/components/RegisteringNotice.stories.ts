import type { Meta, StoryObj } from '@storybook/vue3-vite'

import RegisteringNotice from './RegisteringNotice.vue'

const meta: Meta<typeof RegisteringNotice> = {
  title: 'States/RegisteringNotice',
  component: RegisteringNotice,
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
