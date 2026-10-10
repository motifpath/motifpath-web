import type { Meta, StoryObj } from '@storybook/vue3-vite'

import SkillProgressRow from './SkillProgressRow.vue'

const majorTriads = { node_id: 'major-triads', names: { en: 'Major triads', pt_BR: 'Tríades maiores' } }

const meta = {
  title: 'Cards & progress/SkillProgressRow',
  component: SkillProgressRow,
  decorators: [() => ({ template: '<div class="max-w-[22rem]"><story /></div>' })],
  args: { line: { ...majorTriads, measure: 'accuracy', before: 0.62, after: 0.85 } },
} satisfies Meta<typeof SkillProgressRow>

export default meta
type Story = StoryObj<typeof meta>

export const Accuracy: Story = {}
export const Tempo: Story = { args: { line: { ...majorTriads, measure: 'best_clean_tempo_bpm', before: 80, after: 96 } } }
export const Fluency: Story = { args: { line: { ...majorTriads, measure: 'fluency', before: 0.4, after: 0.55 } } }
export const Dark: Story = { globals: { theme: 'dark' } }
export const Portuguese: Story = { globals: { locale: 'pt-BR', theme: 'dark' } }
