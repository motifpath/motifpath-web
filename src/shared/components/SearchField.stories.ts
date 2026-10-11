import type { Meta, StoryObj } from '@storybook/vue3-vite'

import SearchField from './SearchField.vue'

const meta = {
  title: 'Controls/SearchField',
  component: SearchField,
  args: { modelValue: '', placeholder: 'Search title or artist' },
} satisfies Meta<typeof SearchField>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const WithText: Story = { args: { modelValue: 'grace' } }
