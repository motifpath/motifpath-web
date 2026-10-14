import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeAlphaPathNode } from '@/shared/testUtils/alphaObservation'

import PathNodeRow from './PathNodeRow.vue'

const meta = {
  title: 'Engagement/PathNodeRow',
  component: PathNodeRow,
  args: { node: makeAlphaPathNode() },
} satisfies Meta<typeof PathNodeRow>

export default meta
type Story = StoryObj<typeof meta>

export const Completed: Story = {}
export const InProgress: Story = {
  args: { node: makeAlphaPathNode({ title: 'Changing G → D', status: 'in_progress', completed_at: null, started_at: '2026-10-14T10:00:00Z' }) },
}
export const NotStarted: Story = { args: { node: makeAlphaPathNode({ title: 'Palm muting', status: 'not_started', completed_at: null, started_at: null }) } }
export const Dark: Story = { globals: { theme: 'dark' } }
