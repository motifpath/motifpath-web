import type { Meta, StoryObj } from '@storybook/vue3-vite'

import PathCard from './PathCard.vue'

const meta = {
  title: 'Cards & progress/PathCard',
  component: PathCard,
  decorators: [() => ({ template: '<div class="max-w-[35rem]"><story /></div>' })],
  args: {
    pathName: 'Guitar fundamentals',
    completed: 8,
    total: 14,
    next: { title: 'Step 9 · Inversions', meta: 'Up next · Video' },
    to: { name: 'node', params: { nodeId: 'node-9' } },
  },
} satisfies Meta<typeof PathCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Dark: Story = { globals: { theme: 'dark' } }
export const Complete: Story = { args: { completed: 14, next: null, to: { name: 'path' } } }
export const LongPortuguese: Story = {
  args: {
    pathName: 'Fundamentos do violão',
    next: { title: 'Passo 9 · Tríades maiores e menores em todas as regiões do braço', meta: 'A seguir · Vídeo' },
  },
  globals: { locale: 'pt-BR', theme: 'dark' },
}
