import type { Meta, StoryObj } from '@storybook/vue3-vite'

import EditorAppBar from './EditorAppBar.vue'

const meta = {
  title: 'Teach/EditorAppBar',
  component: EditorAppBar,
  args: { sectionLabel: 'Courses', sectionTo: '/', title: 'Guitar foundations', saveState: 'saved', compact: true },
} satisfies Meta<typeof EditorAppBar>

export default meta
type Story = StoryObj<typeof meta>

export const Saved: Story = {}
export const Unsaved: Story = { args: { saveState: 'unsaved' } }
export const Saving: Story = { args: { saveState: 'saving' } }
export const Expanded: Story = { args: { compact: false, saveState: 'unsaved' } }
export const ExpandedSaved: Story = { args: { compact: false } }
