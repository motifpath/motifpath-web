import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeDiagramRef } from '@/shared/testUtils/diagram'

import SoundSource from './SoundSource.vue'

const meta = {
  title: 'Teacher/SoundSource',
  component: SoundSource,
  args: { sound: null, title: 'Sound' },
  parameters: {
    docs: {
      description: {
        component:
          'One sound of a listening exercise: Upload audio or From a diagram, then where it comes from, ▶ to hear it, and ⋮ Change sound, Edit settings and Remove.',
      },
    },
  },
} satisfies Meta<typeof SoundSource>

export default meta
type Story = StoryObj<typeof meta>

export const NoSoundYet: Story = {}
export const FromADiagram: Story = {
  args: { sound: { kind: 'diagram', ref: makeDiagramRef({ playback: { playback_id: 'playback-riff', direction: 'as_authored', loop: false } }) } },
}
export const UploadedFile: Story = { args: { sound: { kind: 'file', url: 'https://media.test/fifth.mp3' } } }
