import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'
import { ref } from 'vue'

import TimeSignaturePicker from './TimeSignaturePicker.vue'

const meta = {
  title: 'Practice/TimeSignaturePicker',
  component: TimeSignaturePicker,
  args: { modelValue: { beats: 4, beat_value: 4 } },
  render: (args) => ({
    components: { TimeSignaturePicker },
    setup: () => ({ signature: ref(args.modelValue) }),
    template: '<div class="flex w-[342px] justify-center"><TimeSignaturePicker v-model="signature" /></div>',
  }),
} satisfies Meta<typeof TimeSignaturePicker>

export default meta
type Story = StoryObj<typeof meta>

/** The bar as its fraction. */
export const Closed: Story = {}

/** A tap shows the presets and − / + for the beats and the beat note, beside the fraction. */
export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: /time signature|fórmula/i })
    await userEvent.click(button)
    const popover = await within(document.body).findByRole('dialog')
    const anchor = button.getBoundingClientRect()
    const box = popover.getBoundingClientRect()
    await expect(box.top >= anchor.bottom || box.bottom <= anchor.top).toBe(true)
  },
}

/** A preset sets the bar in one tap and closes. */
export const Preset: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /time signature|fórmula/i }))
    await userEvent.click(await within(document.body).findByRole('button', { name: '6/8' }))
    await expect(canvas.getByRole('button', { name: /time signature|fórmula/i })).toHaveTextContent('6/8')
    await expect(within(document.body).queryByRole('dialog')).toBeNull()
  },
}

/** The longest bar, with + at its end. */
export const TwelveEight: Story = { args: { modelValue: { beats: 12, beat_value: 8 } } }
