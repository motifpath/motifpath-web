import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ExercisePrompt from './ExercisePrompt.vue'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'

const meta = {
  title: 'Practice/ExercisePrompt',
  component: ExercisePrompt,
  args: { prompt: plainTextPrompt('Which inversion is shown?') },
} satisfies Meta<typeof ExercisePrompt>

export default meta
type Story = StoryObj<typeof meta>

/** One right option: the prompt alone. */
export const OneAnswer: Story = {}

/** Several right options: how many to choose, under the prompt. */
export const ChooseSeveral: Story = { args: { prompt: plainTextPrompt('Tap the notes of a C major triad'), chooseCount: 3 } }
