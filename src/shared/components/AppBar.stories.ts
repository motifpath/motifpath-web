import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AppBar from './AppBar.vue'

const meta = {
  title: 'Shells/AppBar',
  component: AppBar,
  args: { primaryNavTo: { name: 'teacher-exercises' } },
  globals: { role: 'teacher' },
  parameters: {
    docs: {
      description: {
        component: 'The authoring (Teach) app bar: the authoring sections as tabs, or a hamburger + drawer on Compact.',
      },
    },
  },
} satisfies Meta<typeof AppBar>

export default meta
type Story = StoryObj<typeof meta>

export const Teacher: Story = {}
export const TeacherCompact: Story = { args: { compact: true }, globals: { viewport: { value: 'compact' } } }
/** Admins also get Knowledge map and Song charts. */
export const Admin: Story = { args: { primaryNavTo: { name: 'admin-knowledge-map' } }, globals: { role: 'admin' } }
export const TeacherEditingWithSave: Story = {
  args: {
    breadcrumbLabel: 'Major triads — region 1',
    showSave: true,
    justSaved: true,
  },
}
export const LongPortuguese: Story = { globals: { locale: 'pt-BR', role: 'admin' } }
