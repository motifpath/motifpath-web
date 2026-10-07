import type { Meta, StoryObj } from '@storybook/vue3-vite'

import CreditsView from './CreditsView.vue'

const meta = {
  title: 'Screens/CreditsView',
  component: CreditsView,
  parameters: {
    docs: { description: { component: 'Loads the instrument voices from the API; without one it shows its error state.' } },
  },
} satisfies Meta<typeof CreditsView>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
