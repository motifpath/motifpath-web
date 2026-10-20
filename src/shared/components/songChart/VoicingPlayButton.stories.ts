import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { cOpen, makeVoicingDiagram } from '@/shared/testUtils/songChart'

import VoicingPlayButton from './VoicingPlayButton.vue'

const diagram = makeVoicingDiagram(cOpen)

const meta = {
  title: 'Song charts/VoicingPlayButton',
  component: VoicingPlayButton,
  args: { diagram, instrument: makeFrettedInstrument(), playback: diagram.playbacks[0]! },
  parameters: { docs: { description: { component: 'Plays a voicing with its playback; audio starts only after a tap.' } } },
} satisfies Meta<typeof VoicingPlayButton>

export default meta
type Story = StoryObj<typeof meta>

export const Strum: Story = {}
