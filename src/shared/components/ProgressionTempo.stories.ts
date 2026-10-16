import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'
import { ref } from 'vue'

import ProgressionTempo from './ProgressionTempo.vue'

const meta = {
  title: 'Practice/ProgressionTempo',
  component: ProgressionTempo,
  args: { tempo: 72, noteValue: 'quarters', metronome: false },
  render: (args) => ({
    components: { ProgressionTempo },
    setup: () => ({ tempo: ref(args.tempo), noteValue: ref(args.noteValue), metronome: ref(args.metronome) }),
    template: '<ProgressionTempo v-model:tempo="tempo" v-model:note-value="noteValue" v-model:metronome="metronome" />',
  }),
} satisfies Meta<typeof ProgressionTempo>

export default meta
type Story = StoryObj<typeof meta>

/** The chip beside a drill's Listen. */
export const Chip: Story = {}

/** Tempo: the level's tempo, changeable, with the suggested note values; the bar locked. Done closes it. */
export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /tempo|andamento/i }))
    const body = within(document.body)
    await expect(await body.findByText(/one chord a bar|um acorde por compasso/i)).toBeInTheDocument()
    await expect(body.getByRole('button', { name: /note value|figura/i })).toBeInTheDocument()
  },
}
