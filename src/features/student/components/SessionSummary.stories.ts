import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { components } from '@/api/generated/core-domain'
import type { SummaryRow } from '@/features/student/utils/sessionSummary'
import PracticeShell from '@/shared/components/PracticeShell.vue'
import { practiceOverview } from '@/shared/testUtils/msw/fixtures'
import { failing, respondWith } from '@/shared/testUtils/msw/handlers'

import SessionSummary from './SessionSummary.vue'

type Item = components['schemas']['PracticeSessionItem']

function item(itemKey: string, kind: Item['kind']): Item {
  return { item_key: itemKey, kind, reason: 'new', rung: 'know', node_id: null, level: 'new', estimated_seconds: 30 }
}

const rows: SummaryRow[] = [
  { key: 'play_along:triads', item: item('play_along:triads', 'play_along'), result: { kind: 'played', fastestBpm: 76, rating: 'clean' }, good: true },
  { key: 'exercise:third', item: item('exercise:third', 'exercise'), result: { kind: 'answered', correct: true }, good: true },
  { key: 'fretboard_cell:name_the_note', item: item('fretboard_cell:x', 'fretboard_cell'), result: { kind: 'counted', right: 6, answered: 8 }, good: true },
  { key: 'exercise:quality', item: item('exercise:quality', 'exercise'), result: { kind: 'answered', correct: false }, good: false },
]

const labels: Record<string, string> = {
  'play_along:triads': 'Major triads, region 1',
  'exercise:third': 'Hear the third',
  'fretboard_cell:x': 'Name the note',
  'exercise:quality': 'Major or minor?',
}

const overview = { ...practiceOverview, minutes_practised_last_7: 59, minutes_practised_previous_7: 48, day_streak_current: 4, day_streak_best: 9 }

const meta = {
  title: 'Practice/SessionSummary',
  component: SessionSummary,
  args: { rows, minutes: 11, instrumentName: 'Guitar', itemCount: 9, labelOf: (planItem: Item) => labels[planItem.item_key] ?? planItem.item_key },
  parameters: { msw: { handlers: { practiceOverview: respondWith('practiceOverview', overview) } } },
  render: (args) => ({
    components: { SessionSummary, PracticeShell },
    setup: () => ({ args }),
    template: '<PracticeShell exit-label="Close"><SessionSummary v-bind="args" /></PracticeShell>',
  }),
} satisfies Meta<typeof SessionSummary>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const DarkPortuguese: Story = { globals: { theme: 'dark', locale: 'pt-BR' } }

/** Nothing answered or rated: said plainly, no score. */
export const NothingAnswered: Story = { args: { rows: [], itemCount: 0, minutes: 2 } }

/** This week's numbers didn't load: the results still show. */
export const WeekFailed: Story = { parameters: { msw: { handlers: { practiceOverview: failing('practiceOverview') } } } }
