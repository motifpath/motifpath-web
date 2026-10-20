import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeDiagramRef } from '@/shared/testUtils/diagram'
import { pending } from '@/shared/testUtils/msw/handlers'

import ListenControl from './ListenControl.vue'

const meta = {
  title: 'Practice/ListenControl',
  component: ListenControl,
  args: { sound: makeDiagramRef({ playback: { playback_id: 'playback-riff', direction: 'as_authored', loop: false } }) },
  parameters: {
    docs: {
      description: {
        component:
          'A listening exercise’s sound played from a diagram, before the answer: Play, Listen with the playback’s name and tempo, and a tempo chip to slow it down. The diagram is never drawn or named here.',
      },
    },
  },
} satisfies Meta<typeof ListenControl>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const SetTempo: Story = {
  args: { sound: makeDiagramRef({ playback: { playback_id: 'playback-riff', direction: 'as_authored', loop: false, tempo_bpm: 72 } }) },
  parameters: { docs: { description: { story: 'The exercise sets its own tempo, which the line and the chip show.' } } },
}
export const Loading: Story = { parameters: { msw: { handlers: { diagram: pending('diagram') } } } }
