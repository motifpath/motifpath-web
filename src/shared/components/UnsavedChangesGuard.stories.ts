import type { Meta, StoryObj } from '@storybook/vue3-vite'

import UnsavedChangesGuard from './UnsavedChangesGuard.vue'

// The guard shows nothing until the editor is left with unsaved changes; its dialog is
// ConfirmDialog with "Keep editing" and "Leave" (see Overlays/ConfirmDialog).
const meta = {
  title: 'Teach/UnsavedChangesGuard',
  component: UnsavedChangesGuard,
  args: { dirty: true, message: "Your changes to this course haven't been saved and will be lost." },
} satisfies Meta<typeof UnsavedChangesGuard>

export default meta
type Story = StoryObj<typeof meta>

export const Dirty: Story = {}
