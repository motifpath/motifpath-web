import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { components } from '@/api/generated/core-domain'
import PracticeShell from '@/shared/components/PracticeShell.vue'

import TodaysPlan from './TodaysPlan.vue'

type Item = components['schemas']['PracticeSessionItem']
type FocusNode = components['schemas']['PracticeFocusNode']

const LAYOUT = '6ea2d087-ab9c-59dc-9657-8546025414d2'

function item(itemKey: string, kind: Item['kind'], reason: Item['reason'], fields: Partial<Item> = {}): Item {
  return { item_key: itemKey, kind, reason, rung: 'know', node_id: null, level: 'new', estimated_seconds: 30, ...fields }
}

function cell(fret: number): Item {
  return item(`fretboard_cell:${LAYOUT}:5:${fret}`, 'fretboard_cell', 'weak', {
    fretboard_cell: { layout_instrument_id: LAYOUT, string: 5, fret, drill: 'name_the_note', fret_window: { from_fret: 0 } },
  })
}

const items = [
  item('play_along:warm', 'play_along', 'warm_up'),
  item('exercise:third', 'exercise', 'due'),
  ...[1, 3, 5, 7, 8, 10, 12, 2].map(cell),
  item('exercise:quality', 'exercise', 'new'),
  item('play_along:triads', 'play_along', 'application'),
]

const labels: Record<string, string> = {
  'play_along:warm': 'Warm-up: Am pentatonic, box 1',
  'exercise:third': 'Hear the third',
  'exercise:quality': 'Major or minor?',
  'play_along:triads': 'Major triads, region 1',
}
const labelOf = (planItem: Item) => labels[planItem.item_key] ?? 'Name the note'

const meta = {
  title: 'Practice/TodaysPlan',
  component: TodaysPlan,
  args: { items, minutes: 10, instrumentName: 'Guitar', labelOf },
  render: (args) => ({
    components: { TodaysPlan, PracticeShell },
    setup: () => ({ args }),
    template: '<PracticeShell exit-label="Close"><TodaysPlan v-bind="args" /></PracticeShell>',
  }),
} satisfies Meta<typeof TodaysPlan>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const InTheHead: Story = { args: { instrumentName: 'In my head' } }

const CHORDS = 'aaaaaaaa-0000-4000-8000-000000000001'
const NOTES = 'aaaaaaaa-0000-4000-8000-000000000002'
const EAR = 'aaaaaaaa-0000-4000-8000-000000000003'
const OTHER = 'aaaaaaaa-0000-4000-8000-000000000004'
const mixItems = [
  item('play_along:warm', 'play_along', 'warm_up', { node_id: OTHER }),
  item('exercise:third', 'exercise', 'due', { node_id: OTHER }),
  item('exercise:quality', 'exercise', 'due', { node_id: CHORDS, rung: 'hear' }),
  ...[1, 3, 5].map((fret) => ({ ...cell(fret), node_id: NOTES })),
  item('exercise:chords-new', 'exercise', 'new', { node_id: CHORDS, rung: 'know' }),
  item('play_along:triads', 'play_along', 'new', { node_id: EAR, rung: 'hear' }),
]
const mixNodes: FocusNode[] = [
  { node_id: CHORDS, names: { en: 'Diatonic chords', pt_BR: 'Campo harmônico maior' }, rung: 'know', rung_level: 'new' },
  { node_id: NOTES, names: { en: 'Find notes on the root strings', pt_BR: 'Notas nas cordas 6 e 5' }, rung: 'know', rung_level: 'new' },
  { node_id: EAR, names: { en: 'Hear progressions', pt_BR: 'Reconhecer progressões por graus' }, rung: 'know', rung_level: 'new' },
]

/** Today's mix names its subjects and their rungs; other subjects' due items come as a quick review after the warm-up. */
export const TodaysMixBySubject: Story = { args: { items: mixItems, minutes: 15, focusSource: 'suggested', focusNodes: mixNodes } }
export const TodaysMixDarkPortuguese: Story = { ...TodaysMixBySubject, globals: { theme: 'dark', locale: 'pt-BR' } }

/** A session the student chose: "You chose this" once, above its one subject. */
export const Chosen: Story = {
  args: {
    items: mixItems.slice(2).map((planItem) => ({ ...planItem, node_id: CHORDS })),
    focusSource: 'chosen',
    focusNodes: [{ node_id: CHORDS, names: { en: 'Common progressions' }, rung: 'know', rung_level: 'new' }],
  },
}
