import type { Meta, StoryObj } from '@storybook/vue3-vite'

import PublicLayout from './PublicLayout.vue'

const meta = {
  title: 'Shells/PublicLayout',
  component: PublicLayout,
  parameters: {
    docs: {
      description: {
        component: 'Home and auth route layout: the overview app bar once registered, the plain AppShell header before that.',
      },
    },
  },
} satisfies Meta<typeof PublicLayout>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
