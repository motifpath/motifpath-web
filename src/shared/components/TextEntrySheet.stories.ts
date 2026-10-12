import type { Meta, StoryObj } from '@storybook/vue3-vite'

import TextEntrySheet from './TextEntrySheet.vue'

const meta = {
  title: 'Overlays/TextEntrySheet',
  component: TextEntrySheet,
  args: {
    open: true,
    title: 'Rename in this course',
    label: 'Title in this course',
    hint: "Leave it blank to use the path's own title.",
    placeholder: 'Travis picking',
    value: 'Strumming',
    confirmLabel: 'Rename',
  },
} satisfies Meta<typeof TextEntrySheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
