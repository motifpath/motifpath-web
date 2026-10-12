import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ArrowRight, Pencil, Trash2 } from 'lucide-vue-next'
import { ref } from 'vue'

import OrderedList from './OrderedList.vue'
import OrderedRow from './OrderedRow.vue'

const actions = [
  { id: 'rename', label: 'Rename in this course', icon: Pencil },
  { id: 'open', label: 'Open the path', icon: ArrowRight },
  { id: 'remove', label: 'Remove from course', icon: Trash2, danger: true },
]

const meta = {
  title: 'Teach/OrderedRow',
  component: OrderedRow,
  args: { index: 1, count: 3, title: '2 · Strumming', meta: 'Path · 5 lessons · Published', actions },
} satisfies Meta<typeof OrderedRow>

export default meta
type Story = StoryObj<typeof meta>

export const InAList: Story = {
  render: () => ({
    components: { OrderedList, OrderedRow },
    setup() {
      const rows = ref([
        { title: 'First chords', meta: 'Path · 6 lessons · Published', tone: 'muted' as const },
        { title: 'Strumming', meta: 'Path · 5 lessons · Published', tone: 'muted' as const },
        { title: 'Changes', meta: 'Path · 7 lessons · Draft — publish it first', tone: 'warning' as const },
        { title: 'Your first song', meta: 'Path · 4 lessons · Published', tone: 'muted' as const },
      ])
      function move(from: number, to: number) {
        const next = [...rows.value]
        const [moved] = next.splice(from, 1)
        if (moved) next.splice(to, 0, moved)
        rows.value = next
      }
      return { rows, move, actions }
    },
    template: `
      <OrderedList @move="move">
        <OrderedRow
          v-for="(row, index) in rows"
          :key="row.title"
          :index="index"
          :count="rows.length"
          :title="(index + 1) + ' · ' + row.title"
          :meta="row.meta"
          :meta-tone="row.tone"
          :actions="actions"
        />
      </OrderedList>`,
  }),
}

export const FixedOrder: Story = {
  render: () => ({
    components: { OrderedList, OrderedRow },
    setup: () => ({ actions: [{ id: 'remove', label: 'Remove', icon: Trash2, danger: true }] }),
    template: `
      <OrderedList>
        <OrderedRow :index="0" :count="2" title="0:42 · Chord chart" :draggable="false" :actions="actions" />
        <OrderedRow :index="1" :count="2" title="1:30 · Strumming pattern" :draggable="false" :actions="actions" />
      </OrderedList>`,
  }),
}
