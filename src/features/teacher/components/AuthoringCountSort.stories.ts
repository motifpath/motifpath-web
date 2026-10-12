import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AuthoringCountSort from './AuthoringCountSort.vue'

const meta: Meta<typeof AuthoringCountSort> = {
  title: 'Teach/AuthoringCountSort',
  component: AuthoringCountSort,
  args: { section: 'diagrams', shown: 1284, sectionTotal: 1284, narrowed: false, sort: 'title' },
}

export default meta
type Story = StoryObj<typeof meta>

export const Everything: Story = {}
export const Narrowed: Story = { args: { shown: 46, narrowed: true } }
export const RecentlyChanged: Story = { args: { section: 'exercises', shown: 38, sectionTotal: 312, narrowed: true, sort: 'updated' } }
