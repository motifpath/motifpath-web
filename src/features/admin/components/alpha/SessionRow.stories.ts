import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeAlphaSession } from '@/shared/testUtils/alphaObservation'

import SessionRow from './SessionRow.vue'

const meta = {
  title: 'Engagement/SessionRow',
  component: SessionRow,
  args: { session: makeAlphaSession() },
} satisfies Meta<typeof SessionRow>

export default meta
type Story = StoryObj<typeof meta>

export const Finished: Story = {}
export const EndedEarly: Story = { args: { session: makeAlphaSession({ ended_at: '2026-10-14T10:44:00Z', state: 'ended_early', items_answered: 3 }) } }
export const Abandoned: Story = { args: { session: makeAlphaSession({ ended_at: '2026-10-14T10:46:00Z', state: 'abandoned', items_answered: 5 }) } }
export const InProgress: Story = { args: { session: makeAlphaSession({ ended_at: null, state: 'in_progress', items_answered: 2 }) } }
export const LongPortuguese: Story = { args: { session: makeAlphaSession({ ended_at: '2026-10-14T10:44:00Z', state: 'ended_early', items_answered: 3 }) }, globals: { locale: 'pt-BR' } }
export const Dark: Story = { globals: { theme: 'dark' } }
