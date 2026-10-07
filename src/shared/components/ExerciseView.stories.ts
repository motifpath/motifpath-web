import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { components } from '@/api/generated/core-domain'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'

import ExerciseView from './ExerciseView.vue'

type Option = components['schemas']['Option']

const textOptions: Option[] = [
  { option_id: 'o1', label: 'Major triad', is_correct: true },
  { option_id: 'o2', label: 'Minor triad', is_correct: false },
  { option_id: 'o3', label: 'Diminished triad', is_correct: false },
]

const meta = {
  title: 'Practice/ExerciseView',
  component: ExerciseView,
  args: { exerciseType: 'text_response', prompt: plainTextPrompt('Which triad is this?'), options: textOptions },
  parameters: {
    docs: { description: { component: 'The student’s practice screen and the authoring preview — the same component, so a teacher previews what a student gets.' } },
  },
} satisfies Meta<typeof ExerciseView>

export default meta
type Story = StoryObj<typeof meta>

export const SingleAnswer: Story = {}
export const MultipleAnswers: Story = { args: { allowMultiple: true, prompt: plainTextPrompt('Which of these contain a minor third?') } }
export const Selected: Story = { args: { selectedOptionIds: ['o2'] } }
export const Revealed: Story = { args: { selectedOptionIds: ['o2'], reveal: { correctOptionIds: ['o1'] } } }
export const RowDirection: Story = { args: { direction: 'row' } }
export const LongPortuguese: Story = {
  args: {
    prompt: plainTextPrompt('Ouça o acorde e escolha a qualidade da tríade que você reconhece'),
    options: [
      { option_id: 'o1', label: 'Tríade maior com a terça no baixo', is_correct: true },
      { option_id: 'o2', label: 'Tríade menor em posição fundamental', is_correct: false },
    ],
  },
}
