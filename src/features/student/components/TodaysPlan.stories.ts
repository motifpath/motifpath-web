import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { components } from '@/api/generated/core-domain'
import PracticeShell from '@/shared/components/PracticeShell.vue'

import TodaysPlan from './TodaysPlan.vue'

type Item = components['schemas']['PracticeSessionItem']

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
