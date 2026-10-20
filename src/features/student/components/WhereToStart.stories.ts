import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { failing, pending, respondWith } from '@/shared/testUtils/msw/handlers'
import { startingPoints } from '@/shared/testUtils/msw/fixtures'

import WhereToStart from './WhereToStart.vue'

const meta = {
  title: 'Pages/WhereToStart',
  component: WhereToStart,
  args: {
    answers: { instrumentId: 'instrument-guitar', experience: 'never_played' },
    instrumentName: 'Guitar',
    whatsAppUrl: 'https://wa.me/5511912345678',
  },
} satisfies Meta<typeof WhereToStart>

export default meta
type Story = StoryObj<typeof meta>

/** The paths and courses the team chose for the answers, in their order. */
export const Results: Story = {}
/** Nothing suits the answers: the instrument's other levels. */
export const Closest: Story = {
  parameters: {
    msw: {
      handlers: {
        startingPoints: respondWith('startingPoints', { source: 'catalog', items: [] }),
        catalogPaths: respondWith('catalogPaths', { items: [startingPoints.items[0]!.path!], total: 1, limit: 5, offset: 0 }),
      },
    },
  },
}
/** The instrument has nothing in this language yet. */
export const Nothing: Story = {
  args: { instrumentName: 'Electric bass' },
  parameters: { msw: { handlers: { startingPoints: respondWith('startingPoints', { source: 'catalog', items: [] }) } } },
}
export const Loading: Story = { parameters: { msw: { handlers: { startingPoints: pending('startingPoints') } } } }
export const Failed: Story = { parameters: { msw: { handlers: { startingPoints: failing('startingPoints') } } } }
