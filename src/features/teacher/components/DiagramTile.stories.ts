import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'

import DiagramTile from './DiagramTile.vue'

const meta: Meta<typeof DiagramTile> = {
  title: 'Teach/DiagramTile',
  component: DiagramTile,
  args: {
    diagram: makeFrettedDiagram({ kind: 'custom' }),
    instruments: [makeFrettedInstrument()],
    name: 'A minor pentatonic — box 2',
    meta: 'Guitar · Root A',
    to: '/',
  },
  decorators: [() => ({ template: '<div class="w-44"><story /></div>' })],
}

export default meta
type Story = StoryObj<typeof meta>

export const Custom: Story = {}
export const Template: Story = { args: { diagram: makeFrettedDiagram({ kind: 'basic' }), name: 'A minor pentatonic' } }
