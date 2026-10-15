import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'
import { ref } from 'vue'

import NoteValuePicker from './NoteValuePicker.vue'
import { ALL_NOTE_VALUES, SUGGESTED_NOTE_VALUES } from '@/shared/utils/tempoNoteValue'

const meta = {
  title: 'Practice/NoteValuePicker',
  component: NoteValuePicker,
  args: { modelValue: 'quarters', values: SUGGESTED_NOTE_VALUES, disabled: false },
  render: (args) => ({
    components: { NoteValuePicker },
    setup: () => ({ args, value: ref(args.modelValue) }),
    template:
      '<div class="flex w-[342px] justify-end pt-2"><NoteValuePicker v-model="value" :values="args.values" :disabled="args.disabled" /></div>',
  }),
} satisfies Meta<typeof NoteValuePicker>

export default meta
type Story = StoryObj<typeof meta>

/** Beside the tempo: only the current value shows. */
export const Closed: Story = {}

/** Exercises and drills: the four suggested values; the chosen one is ringed and named. */
export const Suggested: Story = {
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: /note value|figura/i })
    await userEvent.click(button)
    const popover = await within(document.body).findByRole('dialog')
    await expect(within(popover).getAllByRole('radio')).toHaveLength(4)
    // The popover sits beside its button, never over it.
    const anchor = button.getBoundingClientRect()
    const box = popover.getBoundingClientRect()
    await expect(box.top >= anchor.bottom || box.bottom <= anchor.top).toBe(true)
  },
}

/** A choice applies at once and closes the popover. */
export const Choosing: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /note value|figura/i }))
    await userEvent.click(await within(document.body).findByRole('radio', { name: /^eighths|^colcheias/i }))
    await expect(within(document.body).queryByRole('dialog')).toBeNull()
    await expect(canvas.getByRole('button', { name: /eighths|colcheias/i })).toBeInTheDocument()
  },
}

/** A tap outside, or Escape, closes it unchanged. */
export const ClosingUnchanged: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /note value|figura/i }))
    await within(document.body).findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await expect(within(document.body).queryByRole('dialog')).toBeNull()
    await expect(canvas.getByRole('button', { name: /quarters|semínimas/i })).toBeInTheDocument()
  },
}

/** The Metronome tool: every value, in two rows. */
export const Every: Story = {
  args: { values: ALL_NOTE_VALUES },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /note value|figura/i }))
    await expect(within(await within(document.body).findByRole('dialog')).getAllByRole('radio')).toHaveLength(8)
  },
}
