import type { Meta, StoryObj } from '@storybook/vue3-vite'

import StateLoading from './StateLoading.vue'

const meta = {
  title: 'States/StateLoading',
  component: StateLoading,
} satisfies Meta<typeof StateLoading>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithNoun: Story = { args: { noun: 'courses' } }
