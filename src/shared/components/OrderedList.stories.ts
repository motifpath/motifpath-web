import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Trash2 } from 'lucide-vue-next'
import { ref } from 'vue'

import OrderedList from './OrderedList.vue'
import OrderedRow from './OrderedRow.vue'

const meta = {
  title: 'Teach/OrderedList',
  component: OrderedList,
  render: () => ({
    components: { OrderedList, OrderedRow },
    setup() {
      const steps = ref(['Down strums', 'Down-up strums', 'Muted strums'])
      function move(from: number, to: number) {
        const next = [...steps.value]
        const [moved] = next.splice(from, 1)
        if (moved) next.splice(to, 0, moved)
        steps.value = next
      }
      return { steps, move, actions: [{ id: 'remove', label: 'Remove', icon: Trash2, danger: true }] }
    },
    template: `
      <OrderedList @move="move">
        <OrderedRow v-for="(step, index) in steps" :key="step" :index="index" :count="steps.length" :title="step" meta="Video · Published" :actions="actions" />
      </OrderedList>`,
  }),
} satisfies Meta<typeof OrderedList>

export default meta
type Story = StoryObj<typeof meta>

export const PathSteps: Story = {}
