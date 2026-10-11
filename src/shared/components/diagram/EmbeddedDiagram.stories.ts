import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'

import { makeDiagramRef, makeFrettedDiagram } from '@/shared/testUtils/diagram'
import { failing, pending, respondWith } from '@/shared/testUtils/msw/handlers'
import { makeVoicing } from '@/shared/testUtils/songChart'

import EmbeddedDiagram from './EmbeddedDiagram.vue'

const meta = {
  title: 'Diagrams/EmbeddedDiagram',
  component: EmbeddedDiagram,
  args: { embed: { kind: 'single', ref: makeDiagramRef() }, caption: 'Position 1' },
  parameters: {
    docs: {
      description: {
        component:
          'A diagram it cannot show — a failed load, an unknown instrument, a keyboard diagram — renders the `unavailable` slot, or nothing. There is no empty state. With `retryable` (in a lesson’s text), a failed load says so in place and offers Try again.',
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

/** In a lesson's text: a failed load says so where the diagram would be, with Try again. */
export const FailedRetryable: Story = {
  args: { retryable: true },
  parameters: { msw: { handlers: { diagram: failing('diagram') } } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toBeVisible()
    await expect(canvas.getByRole('button', { name: /try again|tentar novamente/i })).toBeVisible()
  },
}

const dOpen = makeFrettedDiagram({
  names: { en: 'D' },
  purpose: 'chord_voicing',
  positions: [
    { position_id: 'p4', string: 4, fret: 0, interval: 'R', note_name: 'D', shape: 'dot' },
    { position_id: 'p3', string: 3, fret: 2, interval: '5', note_name: 'A', shape: 'dot' },
    { position_id: 'p2', string: 2, fret: 3, interval: 'R', note_name: 'D', shape: 'dot' },
    { position_id: 'p1', string: 1, fret: 2, interval: '3', note_name: 'F#', shape: 'dot' },
  ],
  chord_voicing: makeVoicing('d-open', 'chord-d', {
    fret_window: { lowest_fret: 2, highest_fret: 3 },
    fingering: [
      { position_id: 'p3', finger: '1' },
      { position_id: 'p1', finger: '2' },
      { position_id: 'p2', finger: '3' },
    ],
    muted_strings: [6, 5],
  }),
})

/** A chord voicing its author set to show as a chord box, with Box | Neck to switch in place. */
export const ChordVoicing: Story = {
  args: { embed: { kind: 'single', ref: makeDiagramRef({ diagram_id: dOpen.diagram_id, view: 'chord_box' }) }, caption: undefined },
  parameters: { msw: { handlers: { diagram: respondWith('diagram', dOpen) } } },
}
