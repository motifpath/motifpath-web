import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { makeVoicing } from '@/shared/testUtils/songChart'

import ChordBox from './ChordBox.vue'

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

// The open A: its fingers sit on the 2nd fret, but the A and high E strings ring open.
const aOpen = makeVoicing('a-open', 'chord-a', {
  fret_window: { lowest_fret: 2, highest_fret: 2 },
  fingering: [
    { position_id: 'a4', finger: '1' },
    { position_id: 'a3', finger: '2' },
    { position_id: 'a2', finger: '3' },
  ],
  muted_strings: [6],
})
const aOpenDiagram = makeFrettedDiagram({
  diagram_id: aOpen.diagram_id,
  positions: [
    { position_id: 'a5', string: 5, fret: 0, interval: 'R', note_name: 'A', shape: 'dot' },
    { position_id: 'a4', string: 4, fret: 2, interval: '5', note_name: 'E', shape: 'dot' },
    { position_id: 'a3', string: 3, fret: 2, interval: 'R', note_name: 'A', shape: 'dot' },
    { position_id: 'a2', string: 2, fret: 2, interval: '3', note_name: 'C#', shape: 'dot' },
    { position_id: 'a1', string: 1, fret: 0, interval: '5', note_name: 'E', shape: 'dot' },
  ],
})

const meta = {
  title: 'Diagrams/ChordBox',
  component: ChordBox,
  args: { voicing: g7, diagram: g7Diagram, instrument: makeFrettedInstrument(), label: 'G7' },
} satisfies Meta<typeof ChordBox>

export default meta
type Story = StoryObj<typeof meta>

export const OpenG7: Story = {}

/** In practice: twice its size, so each dot is 32 px. */
export const PracticeSize: Story = { args: { scale: 2 } }

/** While the voicing plays, the notes sounding are ringed. */
export const Sounding: Story = { args: { scale: 2, activePositionIds: ['p6', 'p1'] } }

/** An open chord fingered at the 2nd fret still starts at the nut: its open strings ring from it. */
export const OpenA: Story = { args: { voicing: aOpen, diagram: aOpenDiagram, label: 'A', scale: 2 } }

// Every cell of the open A's window a student can tap, the open strings above the nut included.
const aCells = [5, 4, 3, 2, 1].flatMap((string) => [0, 1, 2, 3, 4].map((fret) => ({ optionId: `c-${string}-${fret}`, string, fret })))

/** An author's stimulus: hidden notes faded, answers marked, every note a tap. */
export const Authoring: Story = {
  args: {
    voicing: aOpen,
    diagram: aOpenDiagram,
    label: 'A',
    scale: 2,
    revealHidden: true,
    hiddenPositionIds: ['a3', 'a2'],
    correctPositionIds: ['a4', 'a3', 'a2'],
    selectablePositionIds: ['a5', 'a4', 'a3', 'a2', 'a1'],
  },
}

/** A student answering on the box: the hidden notes left out, two cells picked. */
export const Answering: Story = {
  args: { voicing: aOpen, diagram: aOpenDiagram, label: 'A', hiddenPositionIds: ['a3', 'a2'], answerCells: aCells, multiple: true, selectedAnswerIds: ['c-3-2', 'c-2-3'] },
}

/** After Check: a right pick, a wrong pick, and a right cell not picked. */
export const Graded: Story = {
  args: {
    ...Answering.args,
    answerMarks: { 'c-3-2': 'right', 'c-2-2': 'right', 'c-2-3': 'wrong' },
  },
}

/** A thumbnail, fitted to its card. */
export const Thumbnail: Story = {
  args: { voicing: aOpen, diagram: aOpenDiagram, label: 'A', fit: true },
  render: (args) => ({ components: { ChordBox }, setup: () => ({ args }), template: '<div class="w-32"><ChordBox v-bind="args" /></div>' }),
}
