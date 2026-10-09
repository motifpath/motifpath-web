import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeDiagramRef } from '@/shared/testUtils/diagram'
import { failing, pending } from '@/shared/testUtils/msw/handlers'

import EmbeddedDiagram from './EmbeddedDiagram.vue'

const meta = {
  title: 'Diagrams/EmbeddedDiagram',
  component: EmbeddedDiagram,
  args: { embed: { kind: 'single', ref: makeDiagramRef() }, caption: 'Position 1' },
  parameters: {
    docs: {
      description: {
        component:
          'A diagram it cannot show — a failed load, an unknown instrument, a keyboard diagram — renders the `unavailable` slot, or nothing. There is no empty state.',
      },
    },
  },
} satisfies Meta<typeof EmbeddedDiagram>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Loading: Story = { parameters: { msw: { handlers: { diagram: pending('diagram') } } } }

/** The diagram fails to load; the caller's `unavailable` slot stands in for it. */
export const Failed: Story = {
  parameters: { msw: { handlers: { diagram: failing('diagram') } } },
  render: (args) => ({
    components: { EmbeddedDiagram },
    setup: () => ({ args }),
    template: '<EmbeddedDiagram v-bind="args"><template #unavailable><p class="text-sm text-ink-muted">This diagram can’t be shown right now.</p></template></EmbeddedDiagram>',
  }),
}
