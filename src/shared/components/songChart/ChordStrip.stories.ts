import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { cBarre, cOpen, chordC, chordG, gEShape, gOpen, makeVoicingDiagram } from '@/shared/testUtils/songChart'

import ChordStrip from './ChordStrip.vue'

const meta = {
  title: 'Song charts/ChordStrip',
  component: ChordStrip,
  args: {
    chords: [chordG, chordC],
    diagrams: [gOpen, gEShape, cOpen, cBarre].map(makeVoicingDiagram),
    instrument: makeFrettedInstrument(),
    voicingOf: (chord) => chord.voicings[0]!,
    layout: 'row',
  },
} satisfies Meta<typeof ChordStrip>

export default meta
type Story = StoryObj<typeof meta>

export const UnderTheHeader: Story = {}
export const InTheSidePane: Story = { args: { layout: 'wrap' } }
