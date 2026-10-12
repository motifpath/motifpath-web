import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeDiagramRef } from '@/shared/testUtils/diagram'

import RevealedSoundOption from './RevealedSoundOption.vue'

const meta = {
  title: 'Practice/RevealedSoundOption',
  component: RevealedSoundOption,
  args: {
    label: 'Sound 2',
    sound: makeDiagramRef({ playback: { playback_id: 'playback-riff', direction: 'as_authored', loop: false } }),
    role: 'yours',
    mark: 'wrong',
  },
  parameters: {
    docs: {
      description: {
        component:
          'A sound played from a diagram, once the answer is in: the student’s answer and the right one show their diagrams; the others fold to one line that opens to the drawing.',
      },
    },
  },
} satisfies Meta<typeof RevealedSoundOption>

export default meta
type Story = StoryObj<typeof meta>

export const YourWrongAnswer: Story = {}
export const RightAnswer: Story = { args: { label: 'Sound 3', role: 'right', mark: 'right' } }
export const YourRightAnswer: Story = { args: { label: 'Sound 3', role: 'yours', mark: 'right' } }
export const Folded: Story = { args: { label: 'Sound 1', role: null, mark: undefined } }
