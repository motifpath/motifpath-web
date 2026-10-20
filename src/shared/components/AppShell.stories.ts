import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AppShell from './AppShell.vue'

const meta = {
  title: 'Shells/AppShell',
  component: AppShell,
  args: { nav: [{ to: { name: 'course-catalog' }, label: 'Find a course' }] },
  render: (args) => ({
    components: { AppShell },
    setup: () => ({ args }),
    template: '<AppShell v-bind="args"><p class="text-ink-muted">Page content</p></AppShell>',
  }),
  parameters: {
    docs: { description: { component: 'The header pages use before the app bar applies (signed out, or not yet registered).' } },
  },
} satisfies Meta<typeof AppShell>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const NoNav: Story = { args: { nav: [] } }
