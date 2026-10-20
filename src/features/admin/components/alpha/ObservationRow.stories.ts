import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { ALPHA_NOW, makeAlphaStudent } from '@/shared/testUtils/alphaObservation'

import ObservationRow from './ObservationRow.vue'

const meta = {
  title: 'Engagement/ObservationRow',
  component: ObservationRow,
  args: { student: makeAlphaStudent(), now: ALPHA_NOW, to: { name: 'admin-alpha' } },
  globals: { viewport: { value: 'expanded' } },
} satisfies Meta<typeof ObservationRow>

export default meta
type Story = StoryObj<typeof meta>

export const OneToGo: Story = {}
export const OnTarget: Story = { args: { student: makeAlphaStudent({ display_name: 'Marina Alves', finished_sessions_in_week: 3, at_target_in_week: true }) } }
export const Quiet: Story = {
  args: { student: makeAlphaStudent({ display_name: 'Lucas Pereira', finished_sessions_in_week: 0, last_active_at: '2026-10-05T12:00:00Z', quiet: true }) },
}
export const LongPortuguese: Story = { globals: { locale: 'pt-BR' } }
export const Dark: Story = { globals: { theme: 'dark' } }
