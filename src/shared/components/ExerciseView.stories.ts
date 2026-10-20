import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { components } from '@/api/generated/core-domain'
import { makeDiagramRef } from '@/shared/testUtils/diagram'
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

// A listening exercise whose sound is the fixture diagram's playback: hidden until the answer.
const riffSound = makeDiagramRef({ playback: { playback_id: 'playback-riff', direction: 'as_authored', loop: false } })
const majorOrMinor: Option[] = [
  { option_id: 'major', label: 'Major', is_correct: false },
  { option_id: 'minor', label: 'Minor', is_correct: true },
]
const soundsFromDiagrams: Option[] = ['Sound 1', 'Sound 2', 'Sound 3'].map((label, i) => ({
  option_id: `s${i + 1}`,
  label,
  diagram_ref: riffSound,
  is_correct: i === 2,
}))

export const ListeningToADiagram: Story = {
  args: { exerciseType: 'audio_recognition', prompt: plainTextPrompt('Is this chord major or minor?'), options: majorOrMinor, diagramRef: riffSound },
}
export const ListeningToADiagramAnswered: Story = {
  args: { ...ListeningToADiagram.args, selectedOptionIds: ['major'], reveal: { correctOptionIds: ['minor'] } },
}
export const SoundsFromDiagrams: Story = {
  args: { exerciseType: 'audio_selection', prompt: plainTextPrompt('Which of these sounds is a minor chord?'), options: soundsFromDiagrams },
}
export const SoundsFromDiagramsAnswered: Story = {
  args: { ...SoundsFromDiagrams.args, selectedOptionIds: ['s2'], reveal: { correctOptionIds: ['s3'] } },
}
