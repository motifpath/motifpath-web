import type { Meta, StoryObj } from '@storybook/vue3-vite'

import PracticeLayout from './PracticeLayout.vue'

const meta = {
  title: 'Shells/PracticeLayout',
  component: PracticeLayout,
  parameters: {
    docs: { description: { component: 'Full-screen route layout of a practice run: no app bar, the run renders through its RouterView.' } },
  },
} satisfies Meta<typeof PracticeLayout>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
