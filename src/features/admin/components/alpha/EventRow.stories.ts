import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeLoggedEvent } from '@/shared/testUtils/alphaObservation'

import EventRow from './EventRow.vue'

const meta = {
  title: 'Engagement/EventRow',
  component: EventRow,
  args: { logged: makeLoggedEvent(), studentName: 'Camila Duarte', layout: 'columns' },
  globals: { viewport: { value: 'expanded' } },
} satisfies Meta<typeof EventRow>

export default meta
type Story = StoryObj<typeof meta>

export const SessionEnded: Story = {}
export const Stacked: Story = { args: { layout: 'stacked' }, globals: { viewport: { value: 'compact' } } }
export const LongPortuguese: Story = { args: { layout: 'stacked' }, globals: { locale: 'pt-BR', viewport: { value: 'compact' } } }
export const Dark: Story = { globals: { theme: 'dark' } }
