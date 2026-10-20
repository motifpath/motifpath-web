import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { practiceOverview, practiceSummary } from '@/shared/testUtils/msw/fixtures'
import { failing, notFound, pending, respondWith } from '@/shared/testUtils/msw/handlers'

import StudentHome from './StudentHome.vue'

type Summary = typeof practiceSummary

/** On guitar: 5 learning, 7 accurate, 4 fluent and 2 retained, 2 of them fading. */
const guitarSkills: Summary = {
  ...practiceSummary,
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

const overview = {
  ...practiceOverview,
  minutes_practised_last_7: 48,
  minutes_practised_previous_7: 33,
  songs_played_total: 3,
  instruments: [
    {
      ...practiceOverview.instruments[0]!,
      top_next_step: { kind: 'refresh' as const, node_id: 'skill-major-triads', names: { en: 'Major triads, region 1', pt_BR: 'Tríades maiores, região 1' } },
    },
  ],
}

const meta = {
  title: 'Pages/StudentHome',
  component: StudentHome,
  parameters: {
    msw: { handlers: { practiceOverview: respondWith('practiceOverview', overview), practiceSummary: respondWith('practiceSummary', guitarSkills) } },
  },
} satisfies Meta<typeof StudentHome>

export default meta
type Story = StoryObj<typeof meta>

export const Compact: Story = {}
export const CompactDarkPortuguese: Story = { globals: { theme: 'dark', locale: 'pt-BR' } }
export const Medium: Story = { globals: { viewport: { value: 'medium' } } }
export const Expanded: Story = { globals: { viewport: { value: 'expanded' } } }
export const ExpandedDark: Story = { globals: { viewport: { value: 'expanded' }, theme: 'dark' } }

export const NoStreakFewerMinutes: Story = {
  parameters: {
    msw: {
      handlers: {
        practiceOverview: respondWith('practiceOverview', {
          ...overview,
          minutes_practised_last_7: 20,
          minutes_practised_previous_7: 45,
          day_streak_current: 0,
          songs_played_total: 0,
          songs_played_last_7: 0,
        }),
      },
    },
  },
}
export const NoPath: Story = { parameters: { msw: { handlers: { studentPath: notFound('studentPath') } } } }
export const NoInstruments: Story = {
  parameters: { msw: { handlers: { practiceOverview: respondWith('practiceOverview', { ...overview, instruments: [] }) } } },
}
export const Loading: Story = {
  parameters: { msw: { handlers: { practiceOverview: pending('practiceOverview'), studentPath: pending('studentPath') } } },
}
export const OverviewFailed: Story = { parameters: { msw: { handlers: { practiceOverview: failing('practiceOverview') } } } }
export const SummaryFailed: Story = { parameters: { msw: { handlers: { practiceSummary: failing('practiceSummary') } } } }
