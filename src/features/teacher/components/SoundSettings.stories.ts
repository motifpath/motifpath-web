import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeFrettedInstrument, makeSequencedFrettedDiagram } from '@/shared/testUtils/diagram'

import SoundSettings from './SoundSettings.vue'

const meta = {
  title: 'Teacher/SoundSettings',
  component: SoundSettings,
  args: { diagram: makeSequencedFrettedDiagram(), instrument: makeFrettedInstrument(), initial: null },
  parameters: {
    docs: {
      description: {
        component:
          'How a diagram plays as a listening exercise’s sound: playback, tempo with the length, sound and direction, never loop; the board for the author only; Hear it.',
      },
    },
  },
} satisfies Meta<typeof SoundSettings>

export default meta
type Story = StoryObj<typeof meta>

export const JustPicked: Story = {}
export const BeingEdited: Story = {
  args: {
    initial: {
      diagram_id: 'diagram-a-minor-pentatonic-1',
      layers: { intervals: true },
      playback: { playback_id: 'playback-riff', tempo_bpm: 60, direction: 'reversed', loop: false },
    },
  },
}
