import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeDiagramRef, makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'

import FrettedDiagramView from './FrettedDiagramView.vue'

const meta = {
  title: 'Diagrams/FrettedDiagramView',
  component: FrettedDiagramView,
  args: { diagram: makeFrettedDiagram(), instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef() },
} satisfies Meta<typeof FrettedDiagramView>

export default meta
type Story = StoryObj<typeof meta>

export const Intervals: Story = {}
export const NoteNames: Story = { args: { labelMode: 'note' } }
export const Hidden: Story = { args: { labelMode: 'hidden' } }
export const Compact: Story = { args: { compact: true } }
export const Selectable: Story = { args: { selectablePositionIds: ['p0', 'p1', 'p2', 'p3'], selectedPositionIds: ['p1'] } }
export const Marked: Story = { args: { positionMarks: { p0: 'right', p2: 'wrong' } } }
