import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { TreeNode } from '@/shared/utils/skillConceptTree'

import SkillConceptTreePicker from './SkillConceptTreePicker.vue'

const nodes: TreeNode[] = [
  { id: 'harmony', name: 'Harmony', parent_id: null },
  { id: 'triads', name: 'Triads', parent_id: 'harmony' },
  { id: 'major-triad', name: 'Major triad', parent_id: 'triads' },
  { id: 'minor-triad', name: 'Minor triad', parent_id: 'triads' },
  { id: 'rhythm', name: 'Rhythm', parent_id: null },
  { id: 'subdivision', name: 'Subdivision', parent_id: 'rhythm' },
]

const meta = {
  title: 'Selection/SkillConceptTreePicker',
  component: SkillConceptTreePicker,
  args: { label: 'Concepts', nodes, selectedIds: ['major-triad'] },
} satisfies Meta<typeof SkillConceptTreePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Multiple: Story = {}
export const Single: Story = { args: { multiple: false } }
export const Loading: Story = { args: { isLoading: true, nodes: [] } }
export const LoadFailed: Story = { args: { loadFailed: true, nodes: [] } }
export const WithSuggestions: Story = { args: { selectedIds: [], suggestedIds: ['minor-triad'] } }
