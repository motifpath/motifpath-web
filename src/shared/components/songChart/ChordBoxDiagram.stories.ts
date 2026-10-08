import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { makeVoicing } from '@/shared/testUtils/songChart'

import ChordBoxDiagram from './ChordBoxDiagram.vue'

const g7 = makeVoicing('g7-open', 'chord-g7', {
  fret_window: { lowest_fret: 0, highest_fret: 3 },
  fingering: [
    { position_id: 'p6', finger: '3' },
    { position_id: 'p5', finger: '2' },
    { position_id: 'p1', finger: '1' },
  ],
})
const g7Diagram = makeFrettedDiagram({
  diagram_id: g7.diagram_id,
  positions: [
    { position_id: 'p6', string: 6, fret: 3, interval: 'R', note_name: 'G', shape: 'dot' },
    { position_id: 'p5', string: 5, fret: 2, interval: '3', note_name: 'B', shape: 'dot' },
    { position_id: 'p4', string: 4, fret: 0, interval: '5', note_name: 'D', shape: 'dot' },
    { position_id: 'p3', string: 3, fret: 0, interval: 'R', note_name: 'G', shape: 'dot' },
    { position_id: 'p2', string: 2, fret: 0, interval: '3', note_name: 'B', shape: 'dot' },
    { position_id: 'p1', string: 1, fret: 1, interval: 'b7', note_name: 'F', shape: 'dot' },
  ],
})

const meta = {
  title: 'Song charts/ChordBoxDiagram',
  component: ChordBoxDiagram,
  args: { voicing: g7, diagram: g7Diagram, instrument: makeFrettedInstrument(), label: 'G7' },
} satisfies Meta<typeof ChordBoxDiagram>

export default meta
type Story = StoryObj<typeof meta>

export const OpenG7: Story = {}
