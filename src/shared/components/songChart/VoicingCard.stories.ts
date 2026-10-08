import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { cBarre, cOpen, chordC, makeVoicingDiagram } from '@/shared/testUtils/songChart'

import VoicingCard from './VoicingCard.vue'

const meta = {
  title: 'Song charts/VoicingCard',
  component: VoicingCard,
  args: {
    writtenSymbol: 'C',
    chord: chordC,
    openingVoicing: cOpen,
    diagrams: [cOpen, cBarre].map(makeVoicingDiagram),
    instrument: makeFrettedInstrument(),
    missingBass: null,
  },
} satisfies Meta<typeof VoicingCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const OpensOnThePick: Story = { args: { openingVoicing: cBarre } }
export const SlashChordWithoutItsBass: Story = { args: { writtenSymbol: 'C/B', missingBass: 'B' } }
