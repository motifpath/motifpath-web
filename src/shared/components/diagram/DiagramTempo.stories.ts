import type { Meta, StoryObj } from '@storybook/vue3-vite'
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
