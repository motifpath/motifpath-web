import type { Meta, StoryObj } from '@storybook/vue3-vite'

import FloatingChordCard from './FloatingChordCard.vue'

const meta = {
  title: 'Song charts/FloatingChordCard',
  component: FloatingChordCard,
  args: { corner: 'bottom-right' },
  render: (args) => ({
    components: { FloatingChordCard },
    setup: () => ({ args }),
    template: `
      <FloatingChordCard v-bind="args" @update:corner="args.corner = $event">
        <div class="w-[232px] rounded-2xl border border-border bg-surface p-4 text-ink shadow-level2">Drag me to another corner</div>
      </FloatingChordCard>`,
  }),
} satisfies Meta<typeof FloatingChordCard>

export default meta
type Story = StoryObj<typeof meta>

export const BottomRight: Story = {}
export const TopLeft: Story = { args: { corner: 'top-left' } }
