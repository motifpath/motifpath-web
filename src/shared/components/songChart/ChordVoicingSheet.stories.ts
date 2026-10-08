import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { cBarre, cOpen, chordC, makeVoicingDiagram } from '@/shared/testUtils/songChart'

import ChordVoicingSheet from './ChordVoicingSheet.vue'

const meta = {
  title: 'Song charts/ChordVoicingSheet',
  component: ChordVoicingSheet,
  args: {
    writtenSymbol: 'C',
    chord: chordC,
    openingVoicing: cOpen,
    diagrams: [cOpen, cBarre].map(makeVoicingDiagram),
    instrument: makeFrettedInstrument(),
    missingBass: null,
  },
} satisfies Meta<typeof ChordVoicingSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const OpensOnThePick: Story = { args: { openingVoicing: cBarre } }
export const SlashChordWithoutItsBass: Story = { args: { writtenSymbol: 'C/G', missingBass: 'G' } }
