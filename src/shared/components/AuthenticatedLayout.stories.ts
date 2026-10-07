import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AuthenticatedLayout from './AuthenticatedLayout.vue'

const meta = {
  title: 'Shells/AuthenticatedLayout',
  component: AuthenticatedLayout,
  parameters: {
    docs: { description: { component: 'The learner route layout: the student app bar over the routed page.' } },
  },
} satisfies Meta<typeof AuthenticatedLayout>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
