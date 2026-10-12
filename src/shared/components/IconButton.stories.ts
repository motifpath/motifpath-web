import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Bold, Columns3, Trash2 } from 'lucide-vue-next'

import IconButton from './IconButton.vue'

const meta = {
  title: 'Actions/IconButton',
  component: IconButton,
  args: { label: 'Add column' },
  render: (args) => ({
    components: { IconButton, Columns3 },
    setup: () => ({ args }),
    template: '<IconButton v-bind="args"><Columns3 :size="20" aria-hidden="true" /></IconButton>',
  }),
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

/** Long-press it on a touch screen to see its name. */
export const Default: Story = {}
export const Disabled: Story = { args: { label: 'Split cell', disabled: true } }
export const Danger: Story = {
  args: { label: 'Delete table', tone: 'danger' },
  render: (args) => ({
    components: { IconButton, Trash2 },
    setup: () => ({ args }),
    template: '<IconButton v-bind="args"><Trash2 :size="20" aria-hidden="true" /></IconButton>',
  }),
}
/** A toggle in a dense bar: the phone's rich-text bar. */
export const QuietPressed: Story = {
  args: { label: 'Bold', appearance: 'quiet', pressed: true },
  render: (args) => ({
    components: { IconButton, Bold },
    setup: () => ({ args }),
    template: '<IconButton v-bind="args"><Bold :size="20" aria-hidden="true" /></IconButton>',
  }),
}
