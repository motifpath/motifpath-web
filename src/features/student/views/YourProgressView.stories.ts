import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { practiceOverview, practiceSummary } from '@/shared/testUtils/msw/fixtures'
import { failing, pending, respondWith } from '@/shared/testUtils/msw/handlers'

import YourProgressView from './YourProgressView.vue'

type Summary = typeof practiceSummary

const overview = {
  ...practiceOverview,
  minutes_practised_last_7: 48,
  minutes_practised_previous_7: 33,
  skills_up_last_7: 3,
  instruments: [...practiceOverview.instruments, { instrument_id: 'instrument-bass', practice_days_last_7: 1, top_next_step: null }],
}

/** Three skills moved this week, and skills at every level, two of them fading. */
const guitar: Summary = {
  ...practiceSummary,
  progress_this_week: [
    { node_id: 'skill-major-triads', names: { en: 'Major triads', pt_BR: 'Tríades maiores' }, measure: 'accuracy', before: 0.62, after: 0.85 },
    ...practiceSummary.progress_this_week,
    { node_id: 'skill-hear-the-third', names: { en: 'Hear the third', pt_BR: 'Ouça a terça' }, measure: 'fluency', before: 0.4, after: 0.55 },
  ],
  groups: [
    {
      ...practiceSummary.groups[0]!,
      nodes: (
        [
          ['learning', 5],
          ['accurate', 7],
          ['fluent', 4],
          ['retained', 2],
        ] as const
      ).flatMap(([level, count]) =>
        Array.from({ length: count }, (_, index) => ({
          ...practiceSummary.groups[0]!.nodes[0]!,
          node_id: `${level}-${index}`,
          level,
          fading: index === 0 && (level === 'learning' || level === 'accurate'),
        })),
      ),
    },
  ],
}

const meta = {
  title: 'Pages/YourProgress',
  component: YourProgressView,
  parameters: {
    msw: { handlers: { practiceOverview: respondWith('practiceOverview', overview), practiceSummary: respondWith('practiceSummary', guitar) } },
  },
} satisfies Meta<typeof YourProgressView>

export default meta
type Story = StoryObj<typeof meta>

export const Compact: Story = {}
export const CompactDarkPortuguese: Story = { globals: { theme: 'dark', locale: 'pt-BR' } }
export const Medium: Story = { globals: { viewport: { value: 'medium' } } }
export const Expanded: Story = { globals: { viewport: { value: 'expanded' } } }
export const ExpandedDark: Story = { globals: { viewport: { value: 'expanded' }, theme: 'dark' } }

export const NothingMovedYet: Story = {
  parameters: { msw: { handlers: { practiceSummary: respondWith('practiceSummary', { ...guitar, progress_this_week: [] }) } } },
}
export const Loading: Story = {
  parameters: { msw: { handlers: { practiceOverview: pending('practiceOverview'), practiceSummary: pending('practiceSummary') } } },
}
export const OverviewFailed: Story = { parameters: { msw: { handlers: { practiceOverview: failing('practiceOverview') } } } }
export const SummaryFailed: Story = { parameters: { msw: { handlers: { practiceSummary: failing('practiceSummary') } } } }
