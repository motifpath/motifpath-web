import type { Meta, StoryObj } from '@storybook/vue3-vite'

import StateLocked from './StateLocked.vue'

const meta = {
  title: 'States/StateLocked',
  component: StateLocked,
} satisfies Meta<typeof StateLocked>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
