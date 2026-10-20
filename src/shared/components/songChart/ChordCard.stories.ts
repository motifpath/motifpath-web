import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { cBarre, cOpen, chordC, makeVoicingDiagram } from '@/shared/testUtils/songChart'

import ChordCard from './ChordCard.vue'

const meta = {
  title: 'Song charts/ChordCard',
  component: ChordCard,
  args: {
    writtenSymbol: 'C',
    chord: chordC,
    voicingId: cOpen.chord_voicing_id,
    view: 'box',
    minimized: false,
    diagrams: [cOpen, cBarre].map(makeVoicingDiagram),
    instrument: makeFrettedInstrument(),
    missingBass: null,
    placement: 'floating',
  },
} satisfies Meta<typeof ChordCard>

export default meta
type Story = StoryObj<typeof meta>

export const Box: Story = {}
export const Neck: Story = { args: { view: 'neck' } }
export const UpTheNeck: Story = { args: { voicingId: cBarre.chord_voicing_id } }
export const Minimized: Story = { args: { minimized: true } }
export const Docked: Story = { args: { placement: 'docked' } }
export const SlashChordWithoutItsBass: Story = { args: { writtenSymbol: 'C/B', missingBass: 'B' } }
