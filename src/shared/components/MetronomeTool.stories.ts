import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'

import MetronomeTool from './MetronomeTool.vue'
import PracticeShell from './PracticeShell.vue'

const meta = {
  title: 'Practice/MetronomeTool',
  component: MetronomeTool,
  parameters: { layout: 'fullscreen' },
  render: () => ({
    components: { MetronomeTool, PracticeShell },
    template: '<PracticeShell exit-label="Back to practice" title="Metronome"><MetronomeTool /></PracticeShell>',
  }),
} satisfies Meta<typeof MetronomeTool>

export default meta
type Story = StoryObj<typeof meta>

/** As it opens: 80 BPM in 4/4, in quarters, silent. */
export const Ready: Story = {}

/** The fraction shows the presets and − / + for the beats and the beat note. */
export const TimeSignature: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /time signature|fórmula/i }))
    const popover = await within(document.body).findByRole('dialog')
    await userEvent.click(within(popover).getByRole('button', { name: /one beat more|um tempo a mais/i }))
    await userEvent.click(within(popover).getByRole('button', { name: /one beat more|um tempo a mais/i }))
    await userEvent.click(within(popover).getByRole('button', { name: /one beat more|um tempo a mais/i }))
    await userEvent.click(within(popover).getByRole('button', { name: /shorter beat note|figura mais curta/i }))
    await expect(canvas.getByRole('button', { name: /time signature|fórmula/i })).toHaveTextContent('7/8')
    await expect(canvasElement.querySelectorAll('[data-test="beat-dot"]')).toHaveLength(7)
  },
}

/** Every note value, as icons, the chosen one named. */
export const NoteValues: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /note value|figura/i }))
    await expect(within(await within(document.body).findByRole('dialog')).getAllByRole('radio')).toHaveLength(8)
  },
}
