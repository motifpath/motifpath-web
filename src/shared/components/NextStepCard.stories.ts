import type { Meta, StoryObj } from '@storybook/vue3-vite'

import NextStepCard from './NextStepCard.vue'

const meta = {
  title: 'Cards & progress/NextStepCard',
  component: NextStepCard,
  decorators: [() => ({ template: '<div class="max-w-[35rem]"><story /></div>' })],
  args: {
    eyebrow: 'Up next · step 8 of 14',
    title: 'Inversions on the top strings',
    kind: 'video',
    kindLabel: 'Video',
    actionLabel: 'Start lesson',
    to: { name: 'node', params: { nodeId: 'node-8' } },
  },
} satisfies Meta<typeof NextStepCard>

export default meta
type Story = StoryObj<typeof meta>

export const Video: Story = {}
export const Article: Story = { args: { kind: 'article', kindLabel: 'Article' } }
export const InAnotherLanguage: Story = { args: { actionLabel: 'Watch in English' } }
export const LongPortuguese: Story = {
  args: {
    eyebrow: 'A seguir · passo 8 de 14',
    title: 'Tríades maiores e menores em todas as regiões do braço do violão',
    kindLabel: 'Vídeo',
    actionLabel: 'Assistir em inglês',
  },
}
