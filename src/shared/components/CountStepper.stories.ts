import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import { ref } from 'vue'

import CountStepper from './CountStepper.vue'

const meta = {
  title: 'Practice/CountStepper',
  component: CountStepper,
  args: { modelValue: 18, label: 'clean changes' },
  render: (args) => ({
    components: { CountStepper },
    setup: () => ({ args, count: ref(args.modelValue) }),
    template: '<div class="w-[342px]"><CountStepper v-model="count" :label="args.label" /></div>',
  }),
} satisfies Meta<typeof CountStepper>

export default meta
type Story = StoryObj<typeof meta>

/** After the minute: the last count, ready to be corrected. */
export const Default: Story = {}

/** The first count: one fewer can't go below zero. */
export const Zero: Story = { args: { modelValue: 0 } }

/** + and the arrow keys step the count. */
export const Stepping: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /one more|mais um/i }))
    await expect(canvas.getByRole('spinbutton')).toHaveTextContent('19')
    canvas.getByRole('spinbutton').focus()
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    await expect(canvas.getByRole('spinbutton')).toHaveTextContent('17')
  },
}

export const LongPortuguese: Story = { args: { modelValue: 124, label: 'trocas limpas entre os dois acordes' } }
