import type { Meta, StoryObj } from '@storybook/vue3-vite'

import InstrumentIcon from './InstrumentIcon.vue'

const meta = {
  title: 'Icons/InstrumentIcon',
  component: InstrumentIcon,
  args: { icon: 'acoustic_guitar', family: 'fretted' },
  argTypes: {
    icon: { control: 'select', options: ['acoustic_guitar', 'electric_guitar', 'electric_bass', 'piano', 'unknown'] },
    family: { control: 'inline-radio', options: ['fretted', 'keyboard'] },
  },
} satisfies Meta<typeof InstrumentIcon>

export default meta
type Story = StoryObj<typeof meta>

export const AcousticGuitar: Story = {}
export const ElectricBass: Story = { args: { icon: 'electric_bass' } }
export const Piano: Story = { args: { icon: 'piano', family: 'keyboard' } }
export const UnknownFallsBackToFamily: Story = { args: { icon: 'ukulele' } }
