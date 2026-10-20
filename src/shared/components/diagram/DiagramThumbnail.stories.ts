import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'

import DiagramThumbnail from './DiagramThumbnail.vue'

const meta = {
  title: 'Diagrams/DiagramThumbnail',
  component: DiagramThumbnail,
  args: { diagram: makeFrettedDiagram(), instruments: [makeFrettedInstrument()] },
} satisfies Meta<typeof DiagramThumbnail>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const UnknownInstrument: Story = { args: { instruments: [] } }
