import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'
import { ref } from 'vue'

import DiagramTempo from './DiagramTempo.vue'

const meta = {
  title: 'Diagrams/DiagramTempo',
  component: DiagramTempo,
  args: { modelValue: 72, look: 'rail' },
  render: (args) => ({
    components: { DiagramTempo },
    setup() {
      const tempo = ref(args.modelValue)
      return { args, tempo }
    },
    template: '<DiagramTempo v-model="tempo" :look="args.look" />',
  }),
  parameters: {
    docs: {
      description: {
        component:
          'The tempo a diagram plays at: a control named with the tempo that opens a slider and a numeric input on demand. The rail look sits in a diagram’s control rail; the chip look shows the tempo, beside Listen.',
      },
    },
  },
} satisfies Meta<typeof DiagramTempo>

export default meta
type Story = StoryObj<typeof meta>

export const Rail: Story = {}
export const Chip: Story = { args: { look: 'chip' } }

/** A lesson's player: the panel offers the four suggested note values beside the tempo. */
export const WithNoteValues: Story = {
  render: (args) => ({
    components: { DiagramTempo },
    setup() {
      const tempo = ref(args.modelValue)
      const noteValue = ref('quarters')
      return { args, tempo, noteValue }
    },
    template: '<div class="p-2"><DiagramTempo v-model="tempo" v-model:note-value="noteValue" :look="args.look" /></div>',
  }),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /tempo|andamento/i }))
    const body = within(document.body)
    await userEvent.click(await body.findByRole('button', { name: /note value|figura/i }))
    await userEvent.click(await body.findByRole('radio', { name: /^eighths|^colcheias/i }))
    // Choosing a note value in its popover keeps the tempo panel open.
    await expect(document.querySelector('[data-test="diagram-tempo-panel"]')).not.toBeNull()
    await expect(body.getByRole('button', { name: /eighths|colcheias/i })).toBeInTheDocument()
  },
}
