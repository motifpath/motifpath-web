import type { Meta, StoryObj } from '@storybook/vue3-vite'

import KnowledgeFilterPicker from './KnowledgeFilterPicker.vue'

const nodes = [
  { id: 'scales', name: 'Scales', parent_id: null },
  { id: 'pentatonic', name: 'Pentatonic shapes', parent_id: 'scales', instrumentIds: ['guitar'] },
  { id: 'major', name: 'Major scale', parent_id: 'scales' },
  { id: 'modes', name: 'Modes', parent_id: 'scales' },
  { id: 'dorian', name: 'Dorian', parent_id: 'modes' },
  { id: 'lydian', name: 'Lydian', parent_id: 'modes' },
  { id: 'blues', name: 'Blues scale', parent_id: 'scales' },
  { id: 'fretboard', name: 'Fretboard', parent_id: null },
  { id: 'string5', name: 'Notes on string 5', parent_id: 'fretboard', instrumentIds: ['guitar'] },
  { id: 'chords', name: 'Chords', parent_id: null },
]

const meta: Meta<typeof KnowledgeFilterPicker> = {
  title: 'Teach/KnowledgeFilterPicker',
  component: KnowledgeFilterPicker,
  args: { kind: 'skill', nodes, modelValue: ['pentatonic', 'modes'], instrumentId: 'guitar', instrumentName: 'Guitar' },
}

export default meta
type Story = StoryObj<typeof meta>

export const Skills: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } }
export const Concepts: Story = { args: { kind: 'concept', modelValue: [] } }
