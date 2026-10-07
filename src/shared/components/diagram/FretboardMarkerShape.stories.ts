import type { Meta, StoryObj } from '@storybook/vue3-vite'

import FretboardMarkerShape from './FretboardMarkerShape.vue'

const meta = {
  title: 'Diagrams/FretboardMarkerShape',
  component: FretboardMarkerShape,
  args: { cx: 30, cy: 30, shape: 'dot' },
  render: (args) => ({
    components: { FretboardMarkerShape },
    setup: () => ({ args }),
    template: '<svg width="60" height="60" viewBox="0 0 60 60" class="fill-accent"><FretboardMarkerShape v-bind="args" /></svg>',
  }),
} satisfies Meta<typeof FretboardMarkerShape>

export default meta
type Story = StoryObj<typeof meta>

export const Dot: Story = {}
export const Square: Story = { args: { shape: 'square' } }
export const Star: Story = { args: { shape: 'star' } }
