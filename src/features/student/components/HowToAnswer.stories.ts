import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'

import HowToAnswer from './HowToAnswer.vue'

const meta = {
  title: 'Practice/HowToAnswer',
  component: HowToAnswer,
  args: { exerciseType: 'text_response', allowMultiple: false },
} satisfies Meta<typeof HowToAnswer>

export default meta
type Story = StoryObj<typeof meta>

/** Closed: a toggle above the options. */
export const Closed: Story = {}

/** Open in place, the options still in view below it. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /How to answer/ }))
    await expect(within(canvasElement).getByText(/Then tap Next/)).toBeVisible()
  },
}

/** A diagram stimulus with several right markers. */
export const DiagramMultiple: Story = {
  args: { exerciseType: 'image_recognition', allowMultiple: true, diagramStimulus: true },
  play: Open.play,
}
