import type { Meta, StoryObj } from '@storybook/vue3-vite'

import LoadMoreButton from './LoadMoreButton.vue'

const meta: Meta<typeof LoadMoreButton> = {
  title: 'Actions/LoadMoreButton',
  component: LoadMoreButton,
  args: { loaded: 20, total: 57 },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Loading: Story = { args: { loading: true } }
export const Failed: Story = { args: { failed: true } }
export const AllLoaded: Story = {
  args: { loaded: 57, total: 57 },
  parameters: { docs: { description: { story: 'Renders nothing: once every item is loaded there is nothing more to offer.' } } },
}
