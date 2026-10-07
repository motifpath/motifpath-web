import type { Meta, StoryObj } from '@storybook/vue3-vite'

import NotFoundView from './NotFoundView.vue'

const meta = {
  title: 'Screens/NotFoundView',
  component: NotFoundView,
} satisfies Meta<typeof NotFoundView>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
