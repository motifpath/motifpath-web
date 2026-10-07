import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeDiagramRef } from '@/shared/testUtils/diagram'

import EmbeddedDiagram from './EmbeddedDiagram.vue'

const meta = {
  title: 'Diagrams/EmbeddedDiagram',
  component: EmbeddedDiagram,
  args: { embed: { kind: 'single', ref: makeDiagramRef() }, caption: 'Position 1' },
  parameters: {
    docs: { description: { component: 'Loads its diagram from the API; until Storybook has a mock API it shows its loading or error state.' } },
  },
} satisfies Meta<typeof EmbeddedDiagram>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
