import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { components } from '@/api/generated/core-domain'
import type { SubjectLevels } from '@/features/student/utils/levelChange'
import type { SummaryRow } from '@/features/student/utils/sessionSummary'
import PracticeShell from '@/shared/components/PracticeShell.vue'
import { practiceOverview } from '@/shared/testUtils/msw/fixtures'
import { failing, respondWith } from '@/shared/testUtils/msw/handlers'

import SessionSummary from './SessionSummary.vue'

type Item = components['schemas']['PracticeSessionItem']
type FocusNode = components['schemas']['PracticeFocusNode']

function item(itemKey: string, kind: Item['kind']): Item {
  return { item_key: itemKey, kind, reason: 'new', rung: 'know', node_id: null, level: 'new', estimated_seconds: 30 }
}

const rows: SummaryRow[] = [
  { key: 'play_along:triads', item: item('play_along:triads', 'play_along'), result: { kind: 'played', fastestBpm: 76, fastestNoteValue: 'quarters', rating: 'clean' }, good: true },
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

const chords: FocusNode = { node_id: 'aaaaaaaa-0000-4000-8000-000000000001', names: { en: 'Diatonic chords', pt_BR: 'Campo harmônico maior' }, rung: 'know', rung_level: 'learning' }
const notes: FocusNode = { node_id: 'aaaaaaaa-0000-4000-8000-000000000002', names: { en: 'Find notes on the root strings', pt_BR: 'Notas nas cordas 6 e 5' }, rung: 'know', rung_level: 'accurate' }
const progressions: FocusNode = { node_id: 'aaaaaaaa-0000-4000-8000-000000000003', names: { en: 'Hear progressions', pt_BR: 'Reconhecer progressões por graus' }, rung: 'hear', rung_level: 'new' }

/** Where the student stands on the subjects once the session caught up. */
const caughtUp: SubjectLevels = {
  state: 'read',
  subjects: [
    { node_id: chords.node_id, current_rung: 'hear', rungs: [{ rung: 'know', level: 'accurate' }, { rung: 'hear', level: 'new' }] },
    { node_id: notes.node_id, current_rung: 'know', rungs: [{ rung: 'know', level: 'accurate' }] },
    { node_id: progressions.node_id, current_rung: 'hear', rungs: [{ rung: 'know', level: 'accurate' }, { rung: 'hear', level: 'learning' }] },
  ],
}

/**
 * Today's mix: one result per subject with its level change on the rung practised, the quick
 * review in one line, the items behind Every item.
 */
export const TodaysMixBySubject: Story = {
  args: {
    itemCount: 31,
    minutes: 16,
    subjects: [
      { node: chords, right: 9, answered: 10, rungs: ['know', 'hear'] },
      { node: notes, right: 7, answered: 8, rungs: ['know'] },
      { node: progressions, right: 2, answered: 4, rungs: ['hear'] },
    ],
    review: { right: 4, answered: 5 },
    levels: caughtUp,
  },
}
export const TodaysMixDarkPortuguese: Story = { ...TodaysMixBySubject, globals: { theme: 'dark', locale: 'pt-BR' } }

/** While the session catches up: the scores show, and each level change keeps its place. */
export const LevelsPending: Story = { args: { ...TodaysMixBySubject.args, levels: { state: 'pending' } } }

/** The session didn't catch up in time: each subject shows the rungs practised instead. */
export const LevelsUnknown: Story = { args: { ...TodaysMixBySubject.args, levels: { state: 'unknown' } } }

/** A session the student chose: its one subject, then its items listed. */
export const Chosen: Story = {
  args: { chosen: true, subjects: [{ node: { ...progressions, names: { en: 'Common progressions' } }, right: 7, answered: 9, rungs: ['hear'] }] },
}
