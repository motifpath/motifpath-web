import type { Meta, StoryObj } from '@storybook/vue3-vite'

import TempoNoteValueIcon from './TempoNoteValueIcon.vue'
import { ALL_NOTE_VALUES } from '@/shared/utils/tempoNoteValue'

const meta = {
  title: 'Practice/TempoNoteValueIcon',
  component: TempoNoteValueIcon,
  args: { value: 'eighths' },
} satisfies Meta<typeof TempoNoteValueIcon>

export default meta
type Story = StoryObj<typeof meta>

export const Eighths: Story = {}

/** Every note value, slowest first, in the text colour (so it follows the theme). */
export const All: Story = {
  render: () => ({
    components: { TempoNoteValueIcon },
    setup: () => ({ values: ALL_NOTE_VALUES }),
    template: '<div class="flex gap-4 text-ink"><TempoNoteValueIcon v-for="value in values" :key="value" :value="value" /></div>',
  }),
}
