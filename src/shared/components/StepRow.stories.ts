import type { Meta, StoryObj } from '@storybook/vue3-vite'

import StepRow from './StepRow.vue'

const meta = {
  title: 'Cards & progress/StepRow',
  component: StepRow,
  // A list item: it only renders inside the list its caller provides.
  decorators: [() => ({ template: '<ol class="max-w-[35rem]"><story /></ol>' })],
  args: {
    state: 'current',
    position: 8,
    title: 'Inversions on the top strings',
    meta: 'Up next · Video',
    to: { name: 'node', params: { nodeId: 'node-8' } },
  },
} satisfies Meta<typeof StepRow>

export default meta
type Story = StoryObj<typeof meta>

export const Current: Story = {}
export const Done: Story = { args: { state: 'done', meta: 'Video · Done' } }
export const Open: Story = { args: { state: 'open', meta: 'Article' } }
export const Locked: Story = { args: { state: 'locked', meta: 'Video', to: undefined } }
export const Language: Story = { args: { state: 'language', meta: 'Only in English for now', to: undefined } }
export const LongPortuguese: Story = {
  args: {
    state: 'language',
    title: 'Tríades maiores e menores em todas as regiões do braço do violão',
    meta: 'Só em inglês por enquanto',
    to: undefined,
  },
}
