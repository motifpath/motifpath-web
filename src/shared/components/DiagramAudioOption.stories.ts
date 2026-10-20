import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeDiagramRef } from '@/shared/testUtils/diagram'

import DiagramAudioOption from './DiagramAudioOption.vue'

const meta = {
  title: 'Practice/DiagramAudioOption',
  component: DiagramAudioOption,
  args: { label: 'Sound 1', sound: makeDiagramRef({ playback: { playback_id: 'playback-riff', direction: 'as_authored', loop: false } }) },
  parameters: {
    docs: { description: { component: 'A sound to choose, played from a diagram: the same row as a clip, under its neutral label.' } },
  },
} satisfies Meta<typeof DiagramAudioOption>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Selected: Story = { args: { state: 'selected' } }
export const Locked: Story = { args: { state: 'locked' } }
