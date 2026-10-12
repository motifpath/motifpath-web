import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AuthorFilterPicker from './AuthorFilterPicker.vue'

const meta: Meta<typeof AuthorFilterPicker> = {
  title: 'Teach/AuthorFilterPicker',
  component: AuthorFilterPicker,
  args: {
    scope: 'diagrams',
    section: 'diagrams',
    modelValue: undefined,
    me: { user_id: 'u-me', display_name: 'Gilson Yamada' },
  },
  parameters: {
    docs: { description: { component: 'Loads the section’s authors from the API; Storybook shows the empty and failed states without a backend.' } },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
