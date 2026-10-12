import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ListEndLoader from './ListEndLoader.vue'

const meta: Meta<typeof ListEndLoader> = {
  title: 'Lists/ListEndLoader',
  component: ListEndLoader,
  args: { hasMore: true },
}

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {
  parameters: { docs: { description: { story: 'Invisible until the end of the list is in view; then it asks for the next page.' } } },
}
export const Loading: Story = { args: { loading: true } }
export const Failed: Story = { args: { failed: true } }
