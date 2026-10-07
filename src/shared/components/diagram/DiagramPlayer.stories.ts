import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeFrettedInstrument, makeSequencedFrettedDiagram } from '@/shared/testUtils/diagram'

import DiagramPlayer from './DiagramPlayer.vue'

const meta = {
  title: 'Diagrams/DiagramPlayer',
  component: DiagramPlayer,
  args: {
    diagram: makeSequencedFrettedDiagram(),
    instrument: makeFrettedInstrument(),
    playback: { playback_id: 'playback-riff', direction: 'as_authored', loop: false },
  },
  parameters: {
    docs: { description: { component: 'Plays a diagram’s sequence with the instrument’s samples; audio starts only after a tap.' } },
  },
} satisfies Meta<typeof DiagramPlayer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Looping: Story = { args: { playback: { playback_id: 'playback-riff', direction: 'as_authored', loop: true } } }
export const NoPlayback: Story = {
  args: { playback: null },
  parameters: { docs: { description: { story: 'Renders nothing: without a playback there is nothing to play.' } } },
}
