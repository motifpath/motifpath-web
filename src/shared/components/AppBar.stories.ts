import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AppBar from './AppBar.vue'

const meta = {
  title: 'Shells/AppBar',
  component: AppBar,
  args: { context: 'student', primaryNavTo: { name: 'path' } },
  parameters: {
    docs: {
      description: {
        component:
          'Today’s app bar. On Compact it collapses to a hamburger + drawer, which costs an extra tap to switch section — the bottom navigation is meant to replace it there.',
      },
    },
  },
} satisfies Meta<typeof AppBar>

export default meta
type Story = StoryObj<typeof meta>

export const Student: Story = {}
export const StudentCompact: Story = { args: { compact: true } }
export const Overview: Story = { args: { context: 'overview', primaryNavTo: undefined }, globals: { role: 'admin' } }
export const Teacher: Story = { args: { context: 'teacher', primaryNavTo: { name: 'teacher-exercises' } }, globals: { role: 'teacher' } }
export const TeacherEditingWithSave: Story = {
  args: {
    context: 'teacher',
    primaryNavTo: { name: 'teacher-exercises' },
    breadcrumbLabel: 'Major triads — region 1',
    showSave: true,
    justSaved: true,
  },
  globals: { role: 'teacher' },
}
