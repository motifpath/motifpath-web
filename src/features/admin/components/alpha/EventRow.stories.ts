import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeLoggedEvent } from '@/shared/testUtils/alphaObservation'

import EventRow from './EventRow.vue'

const meta = {
  title: 'Engagement/EventRow',
  component: EventRow,
  args: { logged: makeLoggedEvent(), studentName: 'Camila Duarte' },
} satisfies Meta<typeof EventRow>

export default meta
type Story = StoryObj<typeof meta>

export const SessionEnded: Story = {}
export const Compact: Story = { globals: { viewport: { value: 'compact' } } }
export const LongPortuguese: Story = { globals: { locale: 'pt-BR' } }
export const Dark: Story = { globals: { theme: 'dark' } }
